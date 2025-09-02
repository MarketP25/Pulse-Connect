// [CLEANED] Removed redundant React import

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  sent: boolean;
}

export default function ComplaintForm({ value, onChange, onSubmit, disabled, sent }: Props) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold mb-2 text-red-700">Submit a Complaint</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSubmit();
          } catch (error) {
            console.error("Complaint submission failed:", error);
            alert("An error occurred while submitting your complaint.");
          }
        }}
        className="flex flex-col sm:flex-row gap-2"
        aria-label="Complaint Form"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe your issue or complaint..."
          required
          maxLength={500}
          className="flex-1 border rounded px-2 py-1 text-sm"
          aria-label="Complaint"
        />
        <button
          type="submit"
          disabled={disabled}
          className="bg-red-600 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-red-700 transition"
        >
          Submit
        </button>
      </form>
      {sent && (
        <div className="mt-2 text-green-600 text-xs">
          Your complaint has been received. Thank you!
        </div>
      )}
    </section>
  );
}
