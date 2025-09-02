// [CLEANED] Removed redundant React import

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  sent: boolean;
}

export default function FeedbackForm({ value, onChange, onSubmit, disabled, sent }: Props) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold mb-2 text-indigo-700">Your Feedback</h3>
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
          placeholder="Share your feedback..."
          required
          maxLength={300}
          className="flex-1 border rounded px-2 py-1 text-sm"
          aria-label="Feedback"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-indigo-600 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-indigo-700 transition"
        >
          Send
        </button>
      </form>
      {sent && <div className="mt-2 text-green-600 text-xs">Thank you for your feedback!</div>}
    </section>
  );
}
