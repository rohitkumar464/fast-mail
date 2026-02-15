import axios from "axios";
import { useState } from "react";

function Mail() {
  const [formData, setFormData] = useState({
    senderName: "",
    subject: "",
    message: "",
    recipients: "",
  });

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const authorizeGmail = () => {
    const token = localStorage.getItem("token");
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google?token=${token}`;
  };

  const sendMail = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/send-mails`,
        formData,
        { headers: { Authorization: token } },
      );

      setStatus({ type: "success", message: res.data.message });

      setFormData({
        senderName: "",
        subject: "",
        message: "",
        recipients: "",
      });
    } catch (error) {
      setStatus({ type: "danger", message: "Failed to send emails." });
    }

    setLoading(false);
  };

  return (
    <div className="full-screen-center">
      <div className="mail-card">
        <h3 className="text-center mb-4">📧 Fast Mail Launcher</h3>

        {status && (
          <div className={`alert alert-${status.type}`}>{status.message}</div>
        )}

        <button
          className="btn btn-outline-primary mb-3 w-100"
          onClick={authorizeGmail}
        >
          Connect Gmail
        </button>

        <input
          className="form-control mb-3"
          name="senderName"
          placeholder="Sender Name"
          value={formData.senderName}
          onChange={handleChange}
        />

        <input
          className="form-control mb-3"
          name="subject"
          placeholder="Subject"
          value={formData.subject}
          onChange={handleChange}
        />

        <textarea
          className="form-control mb-3"
          rows="4"
          name="message"
          placeholder="Message Body"
          value={formData.message}
          onChange={handleChange}
        ></textarea>

        <textarea
          className="form-control mb-3"
          rows="4"
          name="recipients"
          placeholder="Recipients (comma or newline)"
          value={formData.recipients}
          onChange={handleChange}
        ></textarea>

        <div className="d-flex gap-3 mt-4">
          <button
            className="btn btn-primary w-100"
            onClick={sendMail}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send All"}
          </button>
          <button className="btn btn-secondary w-100" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default Mail;
