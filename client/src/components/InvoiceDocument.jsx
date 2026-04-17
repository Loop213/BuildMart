function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function AddressBlock({ title, address }) {
  return (
    <div className="invoice-card">
      <p className="invoice-eyebrow">{title}</p>
      <p className="invoice-strong">{address?.name || "--"}</p>
      <p>{address?.phone || "--"}</p>
      <p>{address?.address || "--"}</p>
      <p>
        {address?.city || "--"}, {address?.state || "--"} {address?.pincode || ""}
      </p>
    </div>
  );
}

export function InvoiceDocument({ invoice }) {
  const company = invoice?.company || {};
  const order = invoice?.order || {};
  const payments = order.paymentHistory || [];

  return (
    <div className="invoice-page">
      <header className="invoice-header">
        <div className="invoice-company">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="invoice-logo" />
          ) : (
            <div className="invoice-logo invoice-logo-fallback">BM</div>
          )}
          <div>
            <p className="invoice-eyebrow">Construction eCommerce Invoice</p>
            <h1>{company.name}</h1>
            <p>{company.address}</p>
            <p>
              {company.phone} • {company.email}
            </p>
            {company.gstNumber ? <p>GST No: {company.gstNumber}</p> : null}
          </div>
        </div>

        <div className="invoice-meta">
          <div>
            <span>Invoice Number</span>
            <strong>{order.invoiceNumber}</strong>
          </div>
          <div>
            <span>Invoice Date</span>
            <strong>{formatDate(order.createdAt || Date.now())}</strong>
          </div>
          <div>
            <span>Order ID</span>
            <strong>{order._id}</strong>
          </div>
        </div>
      </header>

      <section className="invoice-grid">
        <AddressBlock title="Customer Details" address={order.shippingAddress} />
        <AddressBlock title="Billing Address" address={order.billingAddress || order.shippingAddress} />
        <AddressBlock title="Shipping Address" address={order.shippingAddress} />
      </section>

      <section className="invoice-section">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item) => (
              <tr key={`${order._id}-${item.product}-${item.name}`}>
                <td>{item.name}</td>
                <td>{item.category || item.name}</td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="invoice-summary-wrap">
        <div className="invoice-card">
          <p className="invoice-eyebrow">Payment Details</p>
          <div className="invoice-summary-row">
            <span>Payment Method</span>
            <strong>{order.paymentMethod}</strong>
          </div>
          <div className="invoice-summary-row">
            <span>Payment Status</span>
            <strong>{order.paymentStatus}</strong>
          </div>
          <div className="invoice-summary-row">
            <span>Paid Amount</span>
            <strong className="text-green">{formatCurrency(order.paidAmount)}</strong>
          </div>
          <div className="invoice-summary-row">
            <span>Remaining Due</span>
            <strong className={order.remainingAmount > 0 ? "text-red" : ""}>
              {formatCurrency(order.remainingAmount)}
            </strong>
          </div>
        </div>

        <div className="invoice-card">
          <p className="invoice-eyebrow">Price Summary</p>
          <div className="invoice-summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(order.subtotal)}</strong>
          </div>
          <div className="invoice-summary-row">
            <span>Discount</span>
            <strong>{formatCurrency(order.discountAmount)}</strong>
          </div>
          {order.gstApplied ? (
            <div className="invoice-summary-row">
              <span>GST ({order.gstPercentage}%)</span>
              <strong>{formatCurrency(order.gstAmount)}</strong>
            </div>
          ) : null}
          <div className="invoice-summary-row invoice-summary-total">
            <span>Final Total</span>
            <strong>{formatCurrency(order.totalAmount)}</strong>
          </div>
        </div>
      </section>

      <section className="invoice-section">
        <div className="invoice-section-head">
          <div>
            <p className="invoice-eyebrow">Payment History</p>
            <h2>Passbook Timeline</h2>
          </div>
        </div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Note</th>
              <th>Remaining Balance</th>
            </tr>
          </thead>
          <tbody>
            {payments.length ? (
              payments.map((payment) => (
                <tr key={payment._id || `${payment.date}-${payment.amount}`}>
                  <td>{formatDate(payment.date)}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.status || "Approved"}</td>
                  <td>{payment.note || payment.transactionReference || "--"}</td>
                  <td className={payment.remainingBalance > 0 ? "text-red" : "text-green"}>
                    {formatCurrency(payment.remainingBalance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No payment history available yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="invoice-signature-section">
        <div className="invoice-card invoice-sign-card">
          <p className="invoice-eyebrow">Authorized Signature</p>
          {company.signatureUrl ? (
            <img src={company.signatureUrl} alt="Authorized signature" className="invoice-signature-image" />
          ) : (
            <div className="invoice-placeholder">Signature Placeholder</div>
          )}
        </div>
        <div className="invoice-card invoice-sign-card">
          <p className="invoice-eyebrow">Company Stamp</p>
          {company.stampUrl ? (
            <img src={company.stampUrl} alt="Company stamp" className="invoice-stamp-image" />
          ) : (
            <div className="invoice-placeholder">Stamp Placeholder</div>
          )}
        </div>
      </section>

      <footer className="invoice-footer">
        <p>Thank you for your business.</p>
        <p>{company.termsAndConditions}</p>
      </footer>
    </div>
  );
}
