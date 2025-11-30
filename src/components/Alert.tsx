import "./Alert.css";

function Alert({ alert }: any) {
  if (!alert.visible) return null;

  return (
    <div className={`alert alert-${alert.type}`}>
      {alert.message}
    </div>
  );
}

export default Alert;
