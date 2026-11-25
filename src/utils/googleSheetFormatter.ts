import type { Expense, Report } from '../firebase/types';
import {
  calculateAmountSpent,
  calculateEffectiveBudget,
  calculateTopupAmount,
} from './reportUtils';

export interface SheetsRgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface SheetsColorStyle {
  rgbColor: SheetsRgbColor;
}

export interface SheetsBorder {
  style:
    | 'DOTTED'
    | 'DASHED'
    | 'SOLID'
    | 'SOLID_MEDIUM'
    | 'SOLID_THICK'
    | 'NONE'
    | 'DOUBLE';
  colorStyle: SheetsColorStyle;
}

export interface SheetsGridRange {
  sheetId: number;
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

export interface SheetsCellFormat {
  backgroundColorStyle?: SheetsColorStyle;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  horizontalAlignment?: 'LEFT' | 'CENTER' | 'RIGHT';
  verticalAlignment?: 'TOP' | 'MIDDLE' | 'BOTTOM';
  wrapStrategy?: 'OVERFLOW_CELL' | 'CLIP' | 'WRAP';
  textFormat?: {
    foregroundColorStyle?: SheetsColorStyle;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
  };
  numberFormat?: {
    type:
      | 'TEXT'
      | 'NUMBER'
      | 'PERCENT'
      | 'CURRENCY'
      | 'DATE'
      | 'TIME'
      | 'DATE_TIME'
      | 'SCIENTIFIC';
    pattern?: string;
  };
}

export interface SheetsExtendedValue {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  formulaValue?: string;
}

export interface SheetsCellData {
  userEnteredValue?: SheetsExtendedValue;
  userEnteredFormat?: SheetsCellFormat;
}

export interface SheetsRowData {
  values: SheetsCellData[];
}

export interface SheetsConditionalFormatFormat {
  backgroundColorStyle?: SheetsColorStyle;
  textFormat?: {
    foregroundColorStyle?: SheetsColorStyle;
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
  };
}

export type SheetsBatchUpdateRequest =
  | {
      updateCells: {
        start: {
          sheetId: number;
          rowIndex: number;
          columnIndex: number;
        };
        rows: SheetsRowData[];
        fields: string;
      };
    }
  | {
      mergeCells: {
        range: SheetsGridRange;
        mergeType: 'MERGE_ALL' | 'MERGE_ROWS' | 'MERGE_COLUMNS';
      };
    }
  | {
      updateBorders: {
        range: SheetsGridRange;
        top?: SheetsBorder;
        bottom?: SheetsBorder;
        left?: SheetsBorder;
        right?: SheetsBorder;
        innerHorizontal?: SheetsBorder;
        innerVertical?: SheetsBorder;
      };
    }
  | {
      updateDimensionProperties: {
        range: {
          sheetId: number;
          dimension: 'ROWS' | 'COLUMNS';
          startIndex: number;
          endIndex: number;
        };
        properties: {
          pixelSize: number;
        };
        fields: 'pixelSize';
      };
    }
  | {
      autoResizeDimensions: {
        dimensions: {
          sheetId: number;
          dimension: 'ROWS' | 'COLUMNS';
          startIndex: number;
          endIndex: number;
        };
      };
    }
  | {
      setBasicFilter: {
        filter: {
          range: SheetsGridRange;
        };
      };
    }
  | {
      addConditionalFormatRule: {
        rule: {
          ranges: SheetsGridRange[];
          booleanRule: {
            condition: {
              type:
                | 'NUMBER_GREATER_THAN_EQ'
                | 'NUMBER_LESS'
                | 'NUMBER_GREATER'
                | 'NUMBER_LESS_THAN_EQ'
                | 'CUSTOM_FORMULA';
              values: Array<{ userEnteredValue: string }>;
            };
            format: SheetsConditionalFormatFormat;
          };
        };
        index: number;
      };
    };

export interface BackupSheetProperties {
  title: string;
  index: number;
  gridProperties: {
    rowCount: number;
    columnCount: number;
    frozenRowCount: number;
    hideGridlines: boolean;
  };
  tabColorStyle: SheetsColorStyle;
}

export const SHEET_LAYOUT = {
  COLUMN_COUNT: 7,
  ROW_TITLE_BANNER: 0,
  ROW_SUBTITLE_BAR: 1,
  ROW_TOP_SPACER: 2,
  ROW_SUMMARY_HEADER: 3,
  ROW_SUMMARY_BUDGET: 4,
  ROW_SUMMARY_TOPUP: 5,
  ROW_SUMMARY_EFFECTIVE: 6,
  ROW_SUMMARY_SPENT: 7,
  ROW_SUMMARY_REMAINING: 8,
  ROW_MIDDLE_SPACER: 9,
  ROW_TABLE_HEADER: 10,
  ROW_DATA_START: 11,
  FROZEN_ROW_COUNT: 11,
  UPDATE_CELLS_CHUNK_SIZE: 500,
} as const;

const COLUMN_WIDTHS = [52, 178, 280, 102, 152, 240, 106] as const;

const FONT_FAMILY = 'Roboto';
const CURRENCY_STANDARD_PATTERN = '₹#,##0.00;-₹#,##0.00;₹0.00';
const CURRENCY_SIGNED_PATTERN = '+₹#,##0.00;-₹#,##0.00;₹0.00';
const PERCENT_PATTERN = '0.0%';
const INTEGER_PATTERN = '#,##0';
const DATE_TIME_PATTERN = 'dd mmm yyyy, hh:mm am/pm';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SHEETS_EPOCH_UTC_MS = Date.UTC(1899, 11, 30, 0, 0, 0, 0);

const CELL_PADDING = { top: 5, right: 8, bottom: 5, left: 8 };
const COMPACT_PADDING = { top: 4, right: 8, bottom: 4, left: 8 };

export function hexToRgbColor(hex: string): SheetsRgbColor {
  const normalized = hex.replace(/^#/, '');
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return {
    red: Math.round(r * 10000) / 10000,
    green: Math.round(g * 10000) / 10000,
    blue: Math.round(b * 10000) / 10000,
  };
}

function colorStyle(hex: string): SheetsColorStyle {
  return { rgbColor: hexToRgbColor(hex) };
}

function border(
  style: SheetsBorder['style'],
  hex: string,
): SheetsBorder {
  return { style, colorStyle: colorStyle(hex) };
}

export const PALETTE = {
  // Brand & Header
  navyDark: '#0F172A',
  royalBlue: '#1E3A8A',
  brandBlue: '#2563EB',
  blueText: '#1D4ED8',
  blueSoftBg: '#EFF6FF',
  blueLightBg: '#DBEAFE',
  tableHeaderBg: '#1E293B',
  tableHeaderDivider: '#334155',

  // Neutrals
  white: '#FFFFFF',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0F172A',

  // Debit (Red / Rose)
  debitRowBg: '#FFF7F7',
  debitSoftBg: '#FEF2F2',
  debitBadgeBg: '#FEE2E2',
  debitText: '#DC2626',
  debitDarkText: '#B91C1C',
  debitDeepText: '#991B1B',

  // Credit (Green / Emerald)
  creditRowBg: '#F2FDF7',
  creditSoftBg: '#ECFDF5',
  creditBadgeBg: '#D1FAE5',
  creditText: '#059669',
  creditDarkText: '#047857',
  creditDeepText: '#065F46',

  // Warning (Amber)
  amberSoftBg: '#FEF3C7',
  amberDarkText: '#92400E',
} as const;

export function toFiniteNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function sanitizeSheetTitle(value: string): string {
  const cleaned = value.replace(/[[\]*?/\\]/g, '-').trim();
  const safe = cleaned || 'Backup';
  return safe.slice(0, 100);
}

export function formatReadableDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Converts an ISO timestamp into a timezone-naive Google Sheets serial date number
 * representing local wall-clock time so sorting and date formulas work natively.
 */
export function toSheetsDateSerial(value: string): number | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const localWallClockUtcMs = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );

  return (localWallClockUtcMs - SHEETS_EPOCH_UTC_MS) / MS_PER_DAY;
}

export function formatExpenseAuthor(
  displayName?: string,
  email?: string,
): string {
  const trimmedName = (displayName || '').trim();
  const trimmedEmail = (email || '').trim();

  if (trimmedName && trimmedEmail && trimmedName !== trimmedEmail) {
    return `${trimmedName} <${trimmedEmail}>`;
  }
  return trimmedName || trimmedEmail || 'Unknown';
}

function emptyCell(bgHex: string = PALETTE.white): SheetsCellData {
  return {
    userEnteredFormat: {
      backgroundColorStyle: colorStyle(bgHex),
    },
  };
}

function stringCell(
  value: string,
  format: SheetsCellFormat,
): SheetsCellData {
  return {
    // Explicit stringValue prevents spreadsheet formula injection (CWE-1236)
    userEnteredValue: { stringValue: value },
    userEnteredFormat: format,
  };
}

function numberCell(
  value: number,
  format: SheetsCellFormat,
): SheetsCellData {
  return {
    userEnteredValue: { numberValue: toFiniteNumber(value) },
    userEnteredFormat: format,
  };
}

function formulaCell(
  formula: string,
  format: SheetsCellFormat,
): SheetsCellData {
  return {
    userEnteredValue: { formulaValue: formula },
    userEnteredFormat: format,
  };
}

function baseTextFormat(
  overrides: NonNullable<SheetsCellFormat['textFormat']> = {},
) {
  const { fontSize = 10, ...rest } = overrides;
  return {
    fontFamily: FONT_FAMILY,
    foregroundColorStyle: colorStyle(PALETTE.slate900),
    ...rest,
    // Google Sheets API TextFormat.fontSize requires TYPE_INT32
    fontSize: Math.round(fontSize),
  };
}

function buildTitleBannerRow(report: Report): SheetsRowData {
  const bannerFormat: SheetsCellFormat = {
    backgroundColorStyle: colorStyle(PALETTE.navyDark),
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE',
    padding: { top: 6, right: 12, bottom: 6, left: 12 },
    textFormat: baseTextFormat({
      fontSize: 15,
      bold: true,
      foregroundColorStyle: colorStyle(PALETTE.white),
    }),
  };

  return {
    values: [
      stringCell(
        `Khata Book  •  ${report.title || 'Untitled Report'}`,
        bannerFormat,
      ),
      ...Array.from({ length: SHEET_LAYOUT.COLUMN_COUNT - 1 }, () =>
        emptyCell(PALETTE.navyDark),
      ),
    ],
  };
}

function buildSubtitleBarRow(
  report: Report,
  backupTimestampIso: string,
): SheetsRowData {
  const isDeletedReport = Boolean(report.deleted);
  const subBarBase = (
    align: 'LEFT' | 'CENTER' | 'RIGHT',
    bgHex: string = PALETTE.royalBlue,
    textHex: string = PALETTE.blueLightBg,
    bold = false,
  ): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(bgHex),
    horizontalAlignment: align,
    verticalAlignment: 'MIDDLE',
    padding: { top: 4, right: 12, bottom: 4, left: 12 },
    textFormat: baseTextFormat({
      fontSize: 9,
      bold,
      foregroundColorStyle: colorStyle(textHex),
    }),
  });

  const statusText = isDeletedReport ? 'Soft-Deleted Report' : 'Active Report';
  const statusBg = isDeletedReport ? PALETTE.debitDeepText : PALETTE.royalBlue;
  const statusFg = isDeletedReport ? PALETTE.debitBadgeBg : PALETTE.blueLightBg;

  return {
    values: [
      stringCell(
        `Created: ${formatReadableDateTime(report.createdAt)}`,
        subBarBase('LEFT'),
      ),
      emptyCell(PALETTE.royalBlue),
      emptyCell(PALETTE.royalBlue),
      stringCell(statusText, subBarBase('CENTER', statusBg, statusFg, isDeletedReport)),
      emptyCell(statusBg),
      stringCell(
        `Backed up: ${formatReadableDateTime(backupTimestampIso)}`,
        subBarBase('RIGHT'),
      ),
      emptyCell(PALETTE.royalBlue),
    ],
  };
}

function buildSpacerRow(): SheetsRowData {
  return {
    values: Array.from({ length: SHEET_LAYOUT.COLUMN_COUNT }, () =>
      emptyCell(PALETTE.white),
    ),
  };
}

function buildSummaryHeaderRow(): SheetsRowData {
  const headerFormat: SheetsCellFormat = {
    backgroundColorStyle: colorStyle(PALETTE.blueSoftBg),
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE',
    padding: COMPACT_PADDING,
    textFormat: baseTextFormat({
      fontSize: 10,
      bold: true,
      foregroundColorStyle: colorStyle(PALETTE.royalBlue),
    }),
  };

  return {
    values: [
      stringCell('FINANCIAL SUMMARY (ACTIVE ONLY)', headerFormat),
      emptyCell(PALETTE.blueSoftBg),
      emptyCell(PALETTE.blueSoftBg),
      emptyCell(PALETTE.white),
      stringCell('REPORT OVERVIEW', headerFormat),
      emptyCell(PALETTE.blueSoftBg),
      emptyCell(PALETTE.blueSoftBg),
    ],
  };
}

function buildSummaryRows(report: Report): SheetsRowData[] {
  const expenses = report.expenses;
  const hasExpenses = expenses.length > 0;
  const firstRow = SHEET_LAYOUT.ROW_DATA_START + 1; // 12 (1-based)
  const lastRow = SHEET_LAYOUT.ROW_DATA_START + expenses.length;

  const initialBudget = toFiniteNumber(report.budget);
  const effectiveBudget = calculateEffectiveBudget(report);
  const spentTotal = calculateAmountSpent(report);
  const remainingBudget = effectiveBudget - spentTotal;
  const rawUsedRatio =
    effectiveBudget > 0
      ? spentTotal / effectiveBudget
      : spentTotal > 0
        ? 1
        : 0;

  const deletedCount = expenses.filter((e) => Boolean(e.deleted)).length;

  const labelFormat = (
    bgHex: string = PALETTE.slate50,
    textHex: string = PALETTE.slate700,
    fontSize = 10,
  ): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(bgHex),
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE',
    padding: COMPACT_PADDING,
    textFormat: baseTextFormat({
      fontSize,
      bold: true,
      foregroundColorStyle: colorStyle(textHex),
    }),
  });

  const currencyFormat = (
    bgHex: string,
    textHex: string,
    pattern: string = CURRENCY_STANDARD_PATTERN,
    fontSize = 11,
  ): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(bgHex),
    horizontalAlignment: 'RIGHT',
    verticalAlignment: 'MIDDLE',
    padding: COMPACT_PADDING,
    textFormat: baseTextFormat({
      fontSize,
      bold: true,
      foregroundColorStyle: colorStyle(textHex),
    }),
    numberFormat: {
      type: 'CURRENCY',
      pattern,
    },
  });

  const overviewTextFormat = (
    textHex: string = PALETTE.slate900,
    wrap = false,
  ): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(PALETTE.white),
    horizontalAlignment: 'LEFT',
    verticalAlignment: 'MIDDLE',
    wrapStrategy: wrap ? 'WRAP' : 'OVERFLOW_CELL',
    padding: COMPACT_PADDING,
    textFormat: baseTextFormat({
      fontSize: 9,
      foregroundColorStyle: colorStyle(textHex),
    }),
  });

  const countFormat = (bgHex: string, textHex: string): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(bgHex),
    horizontalAlignment: 'RIGHT',
    verticalAlignment: 'MIDDLE',
    padding: COMPACT_PADDING,
    textFormat: baseTextFormat({
      fontSize: 10,
      bold: true,
      foregroundColorStyle: colorStyle(textHex),
    }),
    numberFormat: {
      type: 'NUMBER',
      pattern: INTEGER_PATTERN,
    },
  });

  const usedBg =
    rawUsedRatio >= 1
      ? PALETTE.debitBadgeBg
      : rawUsedRatio >= 0.75
        ? PALETTE.amberSoftBg
        : PALETTE.creditSoftBg;
  const usedFg =
    rawUsedRatio >= 1
      ? PALETTE.debitDeepText
      : rawUsedRatio >= 0.75
        ? PALETTE.amberDarkText
        : PALETTE.creditDarkText;

  const remainingBg =
    remainingBudget >= 0 ? PALETTE.creditBadgeBg : PALETTE.debitBadgeBg;
  const remainingFg =
    remainingBudget >= 0 ? PALETTE.creditDeepText : PALETTE.debitDeepText;

  const sharedList = (report.sharedWith || []).filter(Boolean);
  const sharedDisplay =
    sharedList.length > 0 ? sharedList.join(', ') : 'Private (Owner only)';

  // Row 5 (index 4): Initial Budget | Budget Used
  const rowBudget: SheetsRowData = {
    values: [
      stringCell('Initial Budget', labelFormat()),
      emptyCell(PALETTE.slate50),
      numberCell(initialBudget, currencyFormat(PALETTE.white, PALETTE.slate900)),
      emptyCell(PALETTE.white),
      stringCell('Budget Used', labelFormat()),
      formulaCell('=IF(C7>0, C8/C7, IF(C8>0, 1, 0))', {
        backgroundColorStyle: colorStyle(usedBg),
        horizontalAlignment: 'RIGHT',
        verticalAlignment: 'MIDDLE',
        padding: COMPACT_PADDING,
        textFormat: baseTextFormat({
          fontSize: 11,
          bold: true,
          foregroundColorStyle: colorStyle(usedFg),
        }),
        numberFormat: {
          type: 'PERCENT',
          pattern: PERCENT_PATTERN,
        },
      }),
      emptyCell(usedBg),
    ],
  };

  // Row 6 (index 5): Total Top-ups | Owner
  const topupCell = hasExpenses
    ? formulaCell(
        `=SUMIFS(E${firstRow}:E${lastRow}, E${firstRow}:E${lastRow}, ">0", G${firstRow}:G${lastRow}, "Active")`,
        currencyFormat(
          PALETTE.creditSoftBg,
          PALETTE.creditDarkText,
          CURRENCY_SIGNED_PATTERN,
        ),
      )
    : numberCell(
        0,
        currencyFormat(
          PALETTE.creditSoftBg,
          PALETTE.creditDarkText,
          CURRENCY_SIGNED_PATTERN,
        ),
      );

  const rowTopup: SheetsRowData = {
    values: [
      stringCell('Total Top-ups (Credit)', labelFormat()),
      emptyCell(PALETTE.slate50),
      topupCell,
      emptyCell(PALETTE.white),
      stringCell('Owner', labelFormat()),
      stringCell(report.owner || 'Unknown', overviewTextFormat(PALETTE.slate900)),
      emptyCell(PALETTE.white),
    ],
  };

  // Row 7 (index 6): Effective Budget | Shared With
  const rowEffective: SheetsRowData = {
    values: [
      stringCell('Effective Budget', labelFormat()),
      emptyCell(PALETTE.slate50),
      formulaCell(
        '=C5+C6',
        currencyFormat(PALETTE.blueSoftBg, PALETTE.blueText),
      ),
      emptyCell(PALETTE.white),
      stringCell('Shared With', labelFormat()),
      stringCell(
        sharedDisplay,
        overviewTextFormat(
          sharedList.length > 0 ? PALETTE.slate700 : PALETTE.slate500,
          true,
        ),
      ),
      emptyCell(PALETTE.white),
    ],
  };

  // Row 8 (index 7): Total Spent | Active Entries
  const spentCell = hasExpenses
    ? formulaCell(
        `=ABS(SUMIFS(E${firstRow}:E${lastRow}, E${firstRow}:E${lastRow}, "<0", G${firstRow}:G${lastRow}, "Active"))`,
        currencyFormat(PALETTE.debitSoftBg, PALETTE.debitText),
      )
    : numberCell(0, currencyFormat(PALETTE.debitSoftBg, PALETTE.debitText));

  const activeEntriesCell = hasExpenses
    ? formulaCell(
        `=COUNTIF(G${firstRow}:G${lastRow}, "Active")`,
        countFormat(PALETTE.creditSoftBg, PALETTE.creditDarkText),
      )
    : numberCell(0, countFormat(PALETTE.creditSoftBg, PALETTE.creditDarkText));

  const rowSpent: SheetsRowData = {
    values: [
      stringCell('Total Spent (Debit)', labelFormat()),
      emptyCell(PALETTE.slate50),
      spentCell,
      emptyCell(PALETTE.white),
      stringCell('Active Entries', labelFormat()),
      activeEntriesCell,
      emptyCell(PALETTE.creditSoftBg),
    ],
  };

  // Row 9 (index 8): Remaining Balance | Deleted Entries
  const deletedBg = deletedCount > 0 ? PALETTE.slate100 : PALETTE.white;
  const deletedEntriesCell = hasExpenses
    ? formulaCell(
        `=COUNTIF(G${firstRow}:G${lastRow}, "Deleted")`,
        countFormat(deletedBg, PALETTE.slate500),
      )
    : numberCell(0, countFormat(deletedBg, PALETTE.slate500));

  const rowRemaining: SheetsRowData = {
    values: [
      stringCell(
        'Remaining Balance',
        labelFormat(remainingBg, remainingFg, 11),
      ),
      emptyCell(remainingBg),
      formulaCell(
        '=C7-C8',
        currencyFormat(
          remainingBg,
          remainingFg,
          CURRENCY_STANDARD_PATTERN,
          12,
        ),
      ),
      emptyCell(PALETTE.white),
      stringCell('Deleted Entries', labelFormat()),
      deletedEntriesCell,
      emptyCell(deletedBg),
    ],
  };

  return [rowBudget, rowTopup, rowEffective, rowSpent, rowRemaining];
}

function buildTableHeaderRow(): SheetsRowData {
  const headers: Array<{ label: string; align: 'LEFT' | 'CENTER' | 'RIGHT' }> = [
    { label: '#', align: 'CENTER' },
    { label: 'Date', align: 'LEFT' },
    { label: 'Expense / Description', align: 'LEFT' },
    { label: 'Type', align: 'CENTER' },
    { label: 'Amount (₹)', align: 'RIGHT' },
    { label: 'Author', align: 'LEFT' },
    { label: 'Status', align: 'CENTER' },
  ];

  return {
    values: headers.map(({ label, align }) =>
      stringCell(label, {
        backgroundColorStyle: colorStyle(PALETTE.tableHeaderBg),
        horizontalAlignment: align,
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 10,
          bold: true,
          foregroundColorStyle: colorStyle(PALETTE.white),
        }),
      }),
    ),
  };
}

function buildExpenseRow(expense: Expense, index: number): SheetsRowData {
  const amount = toFiniteNumber(expense.amount);
  const isDeleted = Boolean(expense.deleted);
  const isDebit = amount < 0;

  const dateSerial = toSheetsDateSerial(expense.date);
  const authorDisplay = formatExpenseAuthor(
    expense.authorDisplayName,
    expense.authorEmail,
  );

  if (isDeleted) {
    const deletedBase = (
      align: 'LEFT' | 'CENTER' | 'RIGHT',
      options: {
        wrap?: boolean;
        bold?: boolean;
        numberFormat?: SheetsCellFormat['numberFormat'];
      } = {},
    ): SheetsCellFormat => ({
      backgroundColorStyle: colorStyle(PALETTE.slate100),
      horizontalAlignment: align,
      verticalAlignment: 'MIDDLE',
      wrapStrategy: options.wrap ? 'WRAP' : 'OVERFLOW_CELL',
      padding: CELL_PADDING,
      textFormat: baseTextFormat({
        fontSize: 9,
        bold: options.bold,
        strikethrough: true,
        foregroundColorStyle: colorStyle(PALETTE.slate500),
      }),
      ...(options.numberFormat ? { numberFormat: options.numberFormat } : {}),
    });

    const dateCell =
      dateSerial !== null
        ? numberCell(
            dateSerial,
            deletedBase('LEFT', {
              numberFormat: { type: 'DATE_TIME', pattern: DATE_TIME_PATTERN },
            }),
          )
        : stringCell(expense.date || '', deletedBase('LEFT'));

    return {
      values: [
        numberCell(
          index + 1,
          deletedBase('CENTER', {
            numberFormat: { type: 'NUMBER', pattern: INTEGER_PATTERN },
          }),
        ),
        dateCell,
        stringCell(expense.title || '', deletedBase('LEFT', { wrap: true })),
        stringCell(isDebit ? 'Debit' : 'Credit', deletedBase('CENTER')),
        numberCell(
          amount,
          deletedBase('RIGHT', {
            bold: true,
            numberFormat: {
              type: 'CURRENCY',
              pattern: CURRENCY_SIGNED_PATTERN,
            },
          }),
        ),
        stringCell(authorDisplay, deletedBase('LEFT', { wrap: true })),
        stringCell('Deleted', {
          backgroundColorStyle: colorStyle(PALETTE.slate200),
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          padding: CELL_PADDING,
          textFormat: baseTextFormat({
            fontSize: 9,
            bold: true,
            italic: true,
            foregroundColorStyle: colorStyle(PALETTE.slate600),
          }),
        }),
      ],
    };
  }

  // Active Debit or Credit row with crisp color-coded styling
  const rowBg = isDebit ? PALETTE.debitRowBg : PALETTE.creditRowBg;
  const typeBg = isDebit ? PALETTE.debitBadgeBg : PALETTE.creditBadgeBg;
  const typeFg = isDebit ? PALETTE.debitDarkText : PALETTE.creditDarkText;
  const amountBg = isDebit ? PALETTE.debitSoftBg : PALETTE.creditSoftBg;
  const amountFg = isDebit ? PALETTE.debitText : PALETTE.creditText;

  const activeText = (
    align: 'LEFT' | 'CENTER' | 'RIGHT',
    textHex: string = PALETTE.slate900,
    options: {
      wrap?: boolean;
      bold?: boolean;
      fontSize?: number;
      numberFormat?: SheetsCellFormat['numberFormat'];
    } = {},
  ): SheetsCellFormat => ({
    backgroundColorStyle: colorStyle(rowBg),
    horizontalAlignment: align,
    verticalAlignment: 'MIDDLE',
    wrapStrategy: options.wrap ? 'WRAP' : 'OVERFLOW_CELL',
    padding: CELL_PADDING,
    textFormat: baseTextFormat({
      fontSize: options.fontSize ?? 10,
      bold: options.bold,
      foregroundColorStyle: colorStyle(textHex),
    }),
    ...(options.numberFormat ? { numberFormat: options.numberFormat } : {}),
  });

  const dateCell =
    dateSerial !== null
      ? numberCell(
          dateSerial,
          activeText('LEFT', PALETTE.slate600, {
            fontSize: 9,
            numberFormat: { type: 'DATE_TIME', pattern: DATE_TIME_PATTERN },
          }),
        )
      : stringCell(
          expense.date || '',
          activeText('LEFT', PALETTE.slate600, { fontSize: 9 }),
        );

  return {
    values: [
      numberCell(
        index + 1,
        activeText('CENTER', PALETTE.slate500, {
          fontSize: 9,
          numberFormat: { type: 'NUMBER', pattern: INTEGER_PATTERN },
        }),
      ),
      dateCell,
      stringCell(
        expense.title || '',
        activeText('LEFT', PALETTE.slate900, { wrap: true, bold: false }),
      ),
      stringCell(isDebit ? 'Debit' : 'Credit', {
        backgroundColorStyle: colorStyle(typeBg),
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 9,
          bold: true,
          foregroundColorStyle: colorStyle(typeFg),
        }),
      }),
      numberCell(amount, {
        backgroundColorStyle: colorStyle(amountBg),
        horizontalAlignment: 'RIGHT',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 10,
          bold: true,
          foregroundColorStyle: colorStyle(amountFg),
        }),
        numberFormat: {
          type: 'CURRENCY',
          pattern: CURRENCY_SIGNED_PATTERN,
        },
      }),
      stringCell(
        authorDisplay,
        activeText('LEFT', PALETTE.slate600, { wrap: true, fontSize: 9 }),
      ),
      stringCell('Active', {
        backgroundColorStyle: colorStyle(PALETTE.creditSoftBg),
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 9,
          bold: true,
          foregroundColorStyle: colorStyle(PALETTE.creditDarkText),
        }),
      }),
    ],
  };
}

function buildEmptyExpensesRow(): SheetsRowData {
  return {
    values: [
      stringCell('No expenses recorded in this report yet.', {
        backgroundColorStyle: colorStyle(PALETTE.slate50),
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 10,
          italic: true,
          foregroundColorStyle: colorStyle(PALETTE.slate500),
        }),
      }),
      ...Array.from({ length: SHEET_LAYOUT.COLUMN_COUNT - 1 }, () =>
        emptyCell(PALETTE.slate50),
      ),
    ],
  };
}

function buildTotalsFooterRow(report: Report): SheetsRowData {
  const firstRow = SHEET_LAYOUT.ROW_DATA_START + 1; // 12 (1-based)
  const lastRow = SHEET_LAYOUT.ROW_DATA_START + report.expenses.length;

  const activeNet =
    calculateTopupAmount(report) - calculateAmountSpent(report);
  const netBg = activeNet >= 0 ? PALETTE.creditSoftBg : PALETTE.debitSoftBg;
  const netFg = activeNet >= 0 ? PALETTE.creditDarkText : PALETTE.debitText;

  return {
    values: [
      stringCell('Net Active Cashflow (Credits − Debits)', {
        backgroundColorStyle: colorStyle(PALETTE.slate100),
        horizontalAlignment: 'RIGHT',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 10,
          bold: true,
          foregroundColorStyle: colorStyle(PALETTE.slate900),
        }),
      }),
      emptyCell(PALETTE.slate100),
      emptyCell(PALETTE.slate100),
      emptyCell(PALETTE.slate100),
      formulaCell(`=SUMIFS(E${firstRow}:E${lastRow}, G${firstRow}:G${lastRow}, "Active")`, {
        backgroundColorStyle: colorStyle(netBg),
        horizontalAlignment: 'RIGHT',
        verticalAlignment: 'MIDDLE',
        padding: CELL_PADDING,
        textFormat: baseTextFormat({
          fontSize: 11,
          bold: true,
          foregroundColorStyle: colorStyle(netFg),
        }),
        numberFormat: {
          type: 'CURRENCY',
          pattern: CURRENCY_SIGNED_PATTERN,
        },
      }),
      formulaCell(
        `=COUNTIF(G${firstRow}:G${lastRow}, "Active")&" active • "&COUNTIF(G${firstRow}:G${lastRow}, "Deleted")&" deleted"`,
        {
          backgroundColorStyle: colorStyle(PALETTE.slate100),
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          padding: CELL_PADDING,
          textFormat: baseTextFormat({
            fontSize: 9,
            bold: true,
            foregroundColorStyle: colorStyle(PALETTE.slate600),
          }),
        },
      ),
      emptyCell(PALETTE.slate100),
    ],
  };
}

export function buildBackupSheetProperties(
  sheetTitle: string,
  expenseCount: number,
): BackupSheetProperties {
  const populatedRows =
    expenseCount > 0
      ? SHEET_LAYOUT.ROW_DATA_START + expenseCount + 1
      : SHEET_LAYOUT.ROW_DATA_START + 1;

  return {
    title: sanitizeSheetTitle(sheetTitle),
    index: 0,
    gridProperties: {
      rowCount: Math.max(populatedRows + 5, 30),
      columnCount: SHEET_LAYOUT.COLUMN_COUNT,
      frozenRowCount: SHEET_LAYOUT.FROZEN_ROW_COUNT,
      hideGridlines: true,
    },
    tabColorStyle: colorStyle(PALETTE.brandBlue),
  };
}

function buildLayoutAndFormattingRequests(
  sheetId: number,
  report: Report,
): SheetsBatchUpdateRequest[] {
  const expenseCount = report.expenses.length;
  const hasExpenses = expenseCount > 0;
  const dataEndRowIndex = SHEET_LAYOUT.ROW_DATA_START + expenseCount; // exclusive
  const totalsRowIndex = dataEndRowIndex;

  const gridRange = (
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number,
  ): SheetsGridRange => ({
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex,
  });

  const requests: SheetsBatchUpdateRequest[] = [];

  // 1. Cell merges
  requests.push(
    // Row 1: Title Banner A1:G1
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_TITLE_BANNER,
          SHEET_LAYOUT.ROW_TITLE_BANNER + 1,
          0,
          SHEET_LAYOUT.COLUMN_COUNT,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    // Row 2: Subtitle bar segments A2:C2, D2:E2, F2:G2
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUBTITLE_BAR,
          SHEET_LAYOUT.ROW_SUBTITLE_BAR + 1,
          0,
          3,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUBTITLE_BAR,
          SHEET_LAYOUT.ROW_SUBTITLE_BAR + 1,
          3,
          5,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUBTITLE_BAR,
          SHEET_LAYOUT.ROW_SUBTITLE_BAR + 1,
          5,
          7,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    // Row 4: Summary card headers A4:C4 and E4:G4
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_HEADER + 1,
          0,
          3,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_HEADER + 1,
          4,
          7,
        ),
        mergeType: 'MERGE_ALL',
      },
    },
    // Rows 5-9: Left card labels A5:B9 and Right card values F5:G9
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_BUDGET,
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
          0,
          2,
        ),
        mergeType: 'MERGE_ROWS',
      },
    },
    {
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_BUDGET,
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
          5,
          7,
        ),
        mergeType: 'MERGE_ROWS',
      },
    },
  );

  if (hasExpenses) {
    requests.push(
      {
        mergeCells: {
          range: gridRange(totalsRowIndex, totalsRowIndex + 1, 0, 4),
          mergeType: 'MERGE_ALL',
        },
      },
      {
        mergeCells: {
          range: gridRange(totalsRowIndex, totalsRowIndex + 1, 5, 7),
          mergeType: 'MERGE_ALL',
        },
      },
    );
  } else {
    requests.push({
      mergeCells: {
        range: gridRange(
          SHEET_LAYOUT.ROW_DATA_START,
          SHEET_LAYOUT.ROW_DATA_START + 1,
          0,
          SHEET_LAYOUT.COLUMN_COUNT,
        ),
        mergeType: 'MERGE_ALL',
      },
    });
  }

  // 2. Crisp card & table borders
  const outerBorder = border('SOLID', PALETTE.slate300);
  const innerBorder = border('SOLID', PALETTE.slate200);
  const accentBorder = border('SOLID_MEDIUM', PALETTE.brandBlue);

  requests.push(
    // Left Financial Summary Card A4:C9
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
          0,
          3,
        ),
        top: outerBorder,
        bottom: outerBorder,
        left: outerBorder,
        right: outerBorder,
        innerHorizontal: innerBorder,
        innerVertical: innerBorder,
      },
    },
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_HEADER + 1,
          0,
          3,
        ),
        bottom: accentBorder,
      },
    },
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING,
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
          0,
          3,
        ),
        top: border('SOLID_MEDIUM', PALETTE.slate400),
      },
    },
    // Right Report Overview Card E4:G9
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
          4,
          7,
        ),
        top: outerBorder,
        bottom: outerBorder,
        left: outerBorder,
        right: outerBorder,
        innerHorizontal: innerBorder,
        innerVertical: innerBorder,
      },
    },
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_SUMMARY_HEADER,
          SHEET_LAYOUT.ROW_SUMMARY_HEADER + 1,
          4,
          7,
        ),
        bottom: accentBorder,
      },
    },
    // Table Header Row A11:G11
    {
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_TABLE_HEADER,
          SHEET_LAYOUT.ROW_TABLE_HEADER + 1,
          0,
          SHEET_LAYOUT.COLUMN_COUNT,
        ),
        top: border('SOLID', PALETTE.tableHeaderBg),
        left: border('SOLID', PALETTE.tableHeaderBg),
        right: border('SOLID', PALETTE.tableHeaderBg),
        bottom: accentBorder,
        innerVertical: border('SOLID', PALETTE.tableHeaderDivider),
      },
    },
  );

  if (hasExpenses) {
    requests.push(
      // Data rows gridlines & outer frame
      {
        updateBorders: {
          range: gridRange(
            SHEET_LAYOUT.ROW_DATA_START,
            dataEndRowIndex,
            0,
            SHEET_LAYOUT.COLUMN_COUNT,
          ),
          left: outerBorder,
          right: outerBorder,
          bottom: outerBorder,
          innerHorizontal: innerBorder,
          innerVertical: innerBorder,
        },
      },
      // Totals footer row borders
      {
        updateBorders: {
          range: gridRange(
            totalsRowIndex,
            totalsRowIndex + 1,
            0,
            SHEET_LAYOUT.COLUMN_COUNT,
          ),
          top: border('SOLID_MEDIUM', PALETTE.tableHeaderBg),
          bottom: border('DOUBLE', PALETTE.tableHeaderBg),
          left: outerBorder,
          right: outerBorder,
          innerVertical: outerBorder,
        },
      },
    );
  } else {
    requests.push({
      updateBorders: {
        range: gridRange(
          SHEET_LAYOUT.ROW_DATA_START,
          SHEET_LAYOUT.ROW_DATA_START + 1,
          0,
          SHEET_LAYOUT.COLUMN_COUNT,
        ),
        left: outerBorder,
        right: outerBorder,
        bottom: outerBorder,
      },
    });
  }

  // 3. Column widths
  COLUMN_WIDTHS.forEach((pixelSize, colIndex) => {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: colIndex,
          endIndex: colIndex + 1,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    });
  });

  // 4. Row heights (explicit for header/summary chrome, auto-resize for wrapped data rows)
  const fixedRowHeights: Array<[number, number, number]> = [
    [SHEET_LAYOUT.ROW_TITLE_BANNER, SHEET_LAYOUT.ROW_TITLE_BANNER + 1, 42],
    [SHEET_LAYOUT.ROW_SUBTITLE_BAR, SHEET_LAYOUT.ROW_SUBTITLE_BAR + 1, 24],
    [SHEET_LAYOUT.ROW_TOP_SPACER, SHEET_LAYOUT.ROW_TOP_SPACER + 1, 10],
    [SHEET_LAYOUT.ROW_SUMMARY_HEADER, SHEET_LAYOUT.ROW_SUMMARY_HEADER + 1, 26],
    [SHEET_LAYOUT.ROW_SUMMARY_BUDGET, SHEET_LAYOUT.ROW_SUMMARY_SPENT + 1, 26],
    [
      SHEET_LAYOUT.ROW_SUMMARY_REMAINING,
      SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
      30,
    ],
    [SHEET_LAYOUT.ROW_MIDDLE_SPACER, SHEET_LAYOUT.ROW_MIDDLE_SPACER + 1, 12],
    [SHEET_LAYOUT.ROW_TABLE_HEADER, SHEET_LAYOUT.ROW_TABLE_HEADER + 1, 32],
  ];

  for (const [startIndex, endIndex, pixelSize] of fixedRowHeights) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex,
          endIndex,
        },
        properties: { pixelSize },
        fields: 'pixelSize',
      },
    });
  }

  // Auto-expand Shared With row if shared with multiple emails
  if ((report.sharedWith?.length || 0) > 1) {
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'ROWS',
          startIndex: SHEET_LAYOUT.ROW_SUMMARY_EFFECTIVE,
          endIndex: SHEET_LAYOUT.ROW_SUMMARY_EFFECTIVE + 1,
        },
      },
    });
  }

  if (hasExpenses) {
    requests.push(
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'ROWS',
            startIndex: SHEET_LAYOUT.ROW_DATA_START,
            endIndex: dataEndRowIndex,
          },
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: totalsRowIndex,
            endIndex: totalsRowIndex + 1,
          },
          properties: { pixelSize: 32 },
          fields: 'pixelSize',
        },
      },
    );
  } else {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: SHEET_LAYOUT.ROW_DATA_START,
          endIndex: SHEET_LAYOUT.ROW_DATA_START + 1,
        },
        properties: { pixelSize: 36 },
        fields: 'pixelSize',
      },
    });
  }

  // 5. Filter dropdowns on Expense Table (excludes Totals footer so sorting never moves Totals)
  if (hasExpenses) {
    requests.push({
      setBasicFilter: {
        filter: {
          range: gridRange(
            SHEET_LAYOUT.ROW_TABLE_HEADER,
            dataEndRowIndex,
            0,
            SHEET_LAYOUT.COLUMN_COUNT,
          ),
        },
      },
    });
  }

  // 6. Dynamic conditional formatting on computed KPI formula cells
  let ruleIndex = 0;

  // Remaining Balance (A9:C9): entire row turns green when >= 0, red when < 0
  const remainingRange = gridRange(
    SHEET_LAYOUT.ROW_SUMMARY_REMAINING,
    SHEET_LAYOUT.ROW_SUMMARY_REMAINING + 1,
    0,
    3,
  );
  requests.push(
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [remainingRange],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$C$9>=0' }],
            },
            format: {
              backgroundColorStyle: colorStyle(PALETTE.creditBadgeBg),
              textFormat: {
                foregroundColorStyle: colorStyle(PALETTE.creditDeepText),
                bold: true,
              },
            },
          },
        },
        index: ruleIndex++,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [remainingRange],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=$C$9<0' }],
            },
            format: {
              backgroundColorStyle: colorStyle(PALETTE.debitBadgeBg),
              textFormat: {
                foregroundColorStyle: colorStyle(PALETTE.debitDeepText),
                bold: true,
              },
            },
          },
        },
        index: ruleIndex++,
      },
    },
  );

  // Budget Used % (F5): red >= 100%, amber >= 75%, green < 75%
  const budgetUsedRange = gridRange(
    SHEET_LAYOUT.ROW_SUMMARY_BUDGET,
    SHEET_LAYOUT.ROW_SUMMARY_BUDGET + 1,
    5,
    6,
  );
  requests.push(
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [budgetUsedRange],
          booleanRule: {
            condition: {
              type: 'NUMBER_GREATER_THAN_EQ',
              values: [{ userEnteredValue: '1' }],
            },
            format: {
              backgroundColorStyle: colorStyle(PALETTE.debitBadgeBg),
              textFormat: {
                foregroundColorStyle: colorStyle(PALETTE.debitDeepText),
                bold: true,
              },
            },
          },
        },
        index: ruleIndex++,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [budgetUsedRange],
          booleanRule: {
            condition: {
              type: 'NUMBER_GREATER_THAN_EQ',
              values: [{ userEnteredValue: '0.75' }],
            },
            format: {
              backgroundColorStyle: colorStyle(PALETTE.amberSoftBg),
              textFormat: {
                foregroundColorStyle: colorStyle(PALETTE.amberDarkText),
                bold: true,
              },
            },
          },
        },
        index: ruleIndex++,
      },
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [budgetUsedRange],
          booleanRule: {
            condition: {
              type: 'NUMBER_LESS',
              values: [{ userEnteredValue: '0.75' }],
            },
            format: {
              backgroundColorStyle: colorStyle(PALETTE.creditSoftBg),
              textFormat: {
                foregroundColorStyle: colorStyle(PALETTE.creditDarkText),
                bold: true,
              },
            },
          },
        },
        index: ruleIndex++,
      },
    },
  );

  // Totals Footer Net Cashflow (E{totalsRow}): green when >= 0, red when < 0
  if (hasExpenses) {
    const netFlowRange = gridRange(totalsRowIndex, totalsRowIndex + 1, 4, 5);
    requests.push(
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [netFlowRange],
            booleanRule: {
              condition: {
                type: 'NUMBER_GREATER_THAN_EQ',
                values: [{ userEnteredValue: '0' }],
              },
              format: {
                backgroundColorStyle: colorStyle(PALETTE.creditSoftBg),
                textFormat: {
                  foregroundColorStyle: colorStyle(PALETTE.creditDarkText),
                  bold: true,
                },
              },
            },
          },
          index: ruleIndex++,
        },
      },
      {
        addConditionalFormatRule: {
          rule: {
            ranges: [netFlowRange],
            booleanRule: {
              condition: {
                type: 'NUMBER_LESS',
                values: [{ userEnteredValue: '0' }],
              },
              format: {
                backgroundColorStyle: colorStyle(PALETTE.debitSoftBg),
                textFormat: {
                  foregroundColorStyle: colorStyle(PALETTE.debitText),
                  bold: true,
                },
              },
            },
          },
          index: ruleIndex++,
        },
      },
    );
  }

  return requests;
}

/**
 * Builds the complete ordered list of Google Sheets batchUpdate request batches
 * for rendering a rich, color-coded financial ledger sheet.
 * For typical reports (<= 500 rows), all writes & styling fit in a single batchUpdate call.
 */
export function buildRichSheetBatches(
  sheetId: number,
  report: Report,
  backupTimestampIso: string = new Date().toISOString(),
): SheetsBatchUpdateRequest[][] {
  const allRows: SheetsRowData[] = [
    buildTitleBannerRow(report),
    buildSubtitleBarRow(report, backupTimestampIso),
    buildSpacerRow(),
    buildSummaryHeaderRow(),
    ...buildSummaryRows(report),
    buildSpacerRow(),
    buildTableHeaderRow(),
  ];

  if (report.expenses.length > 0) {
    report.expenses.forEach((expense, idx) => {
      allRows.push(buildExpenseRow(expense, idx));
    });
    allRows.push(buildTotalsFooterRow(report));
  } else {
    allRows.push(buildEmptyExpensesRow());
  }

  const layoutRequests = buildLayoutAndFormattingRequests(sheetId, report);
  const chunkSize = SHEET_LAYOUT.UPDATE_CELLS_CHUNK_SIZE;

  if (allRows.length <= chunkSize) {
    return [
      [
        {
          updateCells: {
            start: { sheetId, rowIndex: 0, columnIndex: 0 },
            rows: allRows,
            fields: 'userEnteredValue,userEnteredFormat',
          },
        },
        ...layoutRequests,
      ],
    ];
  }

  const batches: SheetsBatchUpdateRequest[][] = [];
  for (let startRow = 0; startRow < allRows.length; startRow += chunkSize) {
    batches.push([
      {
        updateCells: {
          start: { sheetId, rowIndex: startRow, columnIndex: 0 },
          rows: allRows.slice(startRow, startRow + chunkSize),
          fields: 'userEnteredValue,userEnteredFormat',
        },
      },
    ]);
  }

  batches.push(layoutRequests);
  return batches;
}
