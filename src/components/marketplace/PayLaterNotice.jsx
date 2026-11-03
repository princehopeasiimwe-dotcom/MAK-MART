import { ShieldAlert } from "lucide-react";

// Shown on every order form: students should never pay before getting the item.
function PayLaterNotice() {
  return (
    <div className="pay-later-notice" role="note">
      <ShieldAlert size={20} aria-hidden="true" />
      <p>
        <strong>Do not pay any money before delivery.</strong> Pay the seller only after you have
        received and checked your order.
      </p>
    </div>
  );
}

export default PayLaterNotice;