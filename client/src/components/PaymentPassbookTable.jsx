function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatOrderReference(order) {
  if (!order) {
    return "--";
  }
  if (order.invoiceNumber) {
    return order.invoiceNumber;
  }
  if (order._id) {
    return `#${String(order._id).slice(-6).toUpperCase()}`;
  }
  return "--";
}

function getStatusClasses(status) {
  if (status === "Approved") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "Rejected") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

export function PaymentPassbookTable({
  payments = [],
  showStatus = true,
  showRequestedBy = false,
  showOrder = false,
  actionRenderer
}) {
  if (!payments.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
        No payment entries yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10">
      <div
        className={`hidden gap-4 bg-slate-100/80 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-950/80 dark:text-slate-400 md:grid ${
          showOrder && showRequestedBy && actionRenderer
            ? "md:grid-cols-[1.1fr_1fr_0.85fr_0.8fr_0.9fr_1fr_0.95fr]"
            : showOrder && showRequestedBy
              ? "md:grid-cols-[1.2fr_1fr_0.85fr_0.8fr_0.9fr_1fr]"
              : showOrder && showStatus
                ? "md:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.95fr_1fr]"
                : showRequestedBy && actionRenderer
                  ? "md:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_1fr_0.9fr]"
                  : showRequestedBy
                    ? "md:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_1fr]"
                    : showStatus
                      ? "md:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_1fr]"
                      : "md:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]"
        }`}
      >
        <span>Date</span>
        {showOrder ? <span>Order ID</span> : null}
        <span>Amount Paid</span>
        <span>Method</span>
        {showStatus ? <span>Status</span> : null}
        {showRequestedBy ? <span>Requested By</span> : null}
        <span>Remaining Balance</span>
        {actionRenderer ? <span>Action</span> : null}
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {payments.map((payment) => (
          <div
            key={payment._id || `${payment.date}-${payment.amount}-${payment.remainingBalance}`}
            className={`grid gap-4 bg-white/90 px-5 py-4 text-sm dark:bg-slate-900/80 ${
              showOrder && showRequestedBy && actionRenderer
                ? "md:grid-cols-[1.1fr_1fr_0.85fr_0.8fr_0.9fr_1fr_0.95fr]"
                : showOrder && showRequestedBy
                  ? "md:grid-cols-[1.2fr_1fr_0.85fr_0.8fr_0.9fr_1fr]"
                  : showOrder && showStatus
                    ? "md:grid-cols-[1.2fr_1fr_0.9fr_0.9fr_0.95fr_1fr]"
                    : showRequestedBy && actionRenderer
                      ? "md:grid-cols-[1fr_0.8fr_0.8fr_0.9fr_1fr_0.9fr]"
                      : showRequestedBy
                        ? "md:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_1fr]"
                        : showStatus
                          ? "md:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_1fr]"
                          : "md:grid-cols-[1.1fr_0.9fr_0.9fr_1fr]"
            }`}
          >
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {new Date(payment.date).toLocaleDateString("en-IN")}
              </p>
              {payment.note ? <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{payment.note}</p> : null}
            </div>
            {showOrder ? (
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{formatOrderReference(payment.order)}</p>
                {payment.order?._id ? (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Mongo ID: {String(payment.order._id).slice(-8)}
                  </p>
                ) : null}
              </div>
            ) : null}
            <p className="font-semibold text-emerald-600">{formatCurrency(payment.amount)}</p>
            <p className="text-slate-600 dark:text-slate-300">{payment.method}</p>
            {showStatus ? (
              <div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(payment.status)}`}>
                  {payment.status || "Approved"}
                </span>
                {payment.rejectedReason ? (
                  <p className="mt-1 text-xs text-rose-500">{payment.rejectedReason}</p>
                ) : null}
              </div>
            ) : null}
            {showRequestedBy ? (
              <p className="text-slate-600 dark:text-slate-300">
                {payment.user?.name || payment.createdByRole || "--"}
              </p>
            ) : null}
            <p className="font-semibold text-rose-500">{formatCurrency(payment.remainingBalance)}</p>
            {actionRenderer ? <div>{actionRenderer(payment)}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
