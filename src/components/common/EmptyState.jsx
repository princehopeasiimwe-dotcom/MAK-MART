import { PackageOpen } from "lucide-react";
import Button from "./button";

function EmptyState({
  icon: Icon = PackageOpen,
  title = "Nothing here yet",
  message = "There is currently nothing to display.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon size={38} />
      </div>

      <h3>{title}</h3>

      <p>{message}</p>

      {actionLabel && (
        <Button
          variant="primary"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;