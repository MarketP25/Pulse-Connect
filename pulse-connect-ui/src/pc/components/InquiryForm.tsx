// [CLEANED] Removed redundant React import

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  sent: boolean;
}

export default function InquiryForm({ value, onChange, onSubmit, disabled, sent }: Props) {
  return (
    <section className="mt-6 mb-8">
      <h3 className="text-sm font-semibold mb-2 text-indigo-700">General Inquiries</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask a question or make a general inquiry..."
          required
          maxLength={500}
          className="flex-1 border rounded px-2 py-1 text-sm"
          aria-label="Inquiry"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-indigo-500 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-indigo-600 transition"
        >
          Send
        </button>
      </form>
      {sent && (
        <div className="mt-2 text-green-600 text-xs">
          Your inquiry has been received. Thank you!
        </div>
      )}
    </section>
  );
}
