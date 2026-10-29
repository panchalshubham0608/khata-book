package com.khatabook

import android.content.Context
import android.provider.Telephony
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

class SmsReader(private val context: Context) {

    companion object {
        private const val TAG = "SmsReader"
        private const val MAX_MESSAGES = 100
        private const val PREFS_NAME = "khatabook_sms_prefs"
        private const val KEY_PROCESSED_IDS = "processed_sms_ids"
    }

    private val prefs by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getProcessedIds(): Set<String> {
        return prefs.getStringSet(KEY_PROCESSED_IDS, emptySet()) ?: emptySet()
    }

    fun markMessageProcessed(smsId: String) {
        if (smsId.isBlank()) return
        markMessagesProcessed(listOf(smsId))
    }

    fun markMessagesProcessed(smsIds: Collection<String>) {
        val validIds = smsIds.filter { it.isNotBlank() }
        if (validIds.isEmpty()) return
        val updated = getProcessedIds().toMutableSet()
        updated.addAll(validIds)
        prefs.edit().putStringSet(KEY_PROCESSED_IDS, updated).apply()
    }

    fun getInboxMessages(sinceTimestampMillis: Long = 0L): String {
        val messagesArray = JSONArray()
        val processedIds = getProcessedIds()

        try {
            val selection = if (sinceTimestampMillis > 0L) {
                "${Telephony.Sms.DATE} >= ?"
            } else {
                null
            }
            val selectionArgs = if (sinceTimestampMillis > 0L) {
                arrayOf(sinceTimestampMillis.toString())
            } else {
                null
            }

            val cursor = context.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(
                    Telephony.Sms._ID,
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE
                ),
                selection,
                selectionArgs,
                "${Telephony.Sms.DATE} DESC"
            )

            cursor?.use {
                val idIndex = it.getColumnIndexOrThrow(Telephony.Sms._ID)
                val addressIndex = it.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
                val bodyIndex = it.getColumnIndexOrThrow(Telephony.Sms.BODY)
                val dateIndex = it.getColumnIndexOrThrow(Telephony.Sms.DATE)

                var count = 0
                while (it.moveToNext() && count < MAX_MESSAGES) {
                    val smsId = it.getString(idIndex) ?: ""
                    if (smsId.isEmpty() || processedIds.contains(smsId)) {
                        continue
                    }

                    val smsObj = JSONObject().apply {
                        put("id", smsId)
                        put("sender", it.getString(addressIndex) ?: "")
                        put("body", it.getString(bodyIndex) ?: "")
                        put("timestamp", it.getLong(dateIndex))
                    }
                    messagesArray.put(smsObj)
                    count++
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read SMS inbox", e)
        }

        return messagesArray.toString()
    }
}

