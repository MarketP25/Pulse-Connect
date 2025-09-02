import { useState } from "react";
import { submitBooking } from "./useBookings";
import BookingSuccess from "./BookingSuccess";

const services = [
  { id: "graphic_design_course", name: "Graphic Design Course", price: 100 },
  { id: "social_management_course", name: "Social Management Course", price: 150 },
  { id: "web_hosting_service", name: "Web Hosting Service", price: 200 }
];

export default function BookingForm({ listingId }: { listingId: string }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selectedService, setSelectedService] = useState(services[0].id);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const service = services.find((s) => s.id === selectedService);
    if (!service) return;

    setLoading(true);
    try {
      await submitBooking({
        listingId,
        serviceId: selectedService,
        totalAmount: service.price,
        name,
        message
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Booking submission failed:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return <BookingSuccess name={name} />;
  }

  return (
    <form
      className="booking-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <h2>📩 Send Inquiry</h2>

      <div>
        <label htmlFor="booking-name" className="sr-only">
          Your name
        </label>
        <input
          id="booking-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="booking-message" className="sr-only">
          Message to host
        </label>
        <textarea
          id="booking-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message to host"
          required
          aria-required="true"
        />
      </div>

      <div>
        <label htmlFor="service">Select a Service</label>
        <select
          id="service"
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} – ${service.price}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" aria-label="Send booking inquiry" disabled={loading}>
        {loading ? "Sending..." : "Send Booking"}
      </button>
    </form>
  );
}
