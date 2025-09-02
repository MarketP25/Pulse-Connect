"use client";

export default function AdminTerms() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Pulse Connect Admin Terms and Conditions</h1>

      <div className="prose prose-blue max-w-none">
        <h2 className="text-xl font-semibold text-red-600">🚨 Important Notice</h2>
        <p className="text-gray-700">
          As an administrator of Pulse Connect, you are being granted significant privileges and
          responsibilities. Please read these terms carefully before accepting.
        </p>

        <h3 className="font-semibold mt-6">1. Administrator Responsibilities</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Maintain the confidentiality of your admin access code</li>
          <li>Use admin privileges only for legitimate business purposes</li>
          <li>Never share your admin credentials with others</li>
          <li>Report any security concerns immediately</li>
          <li>Follow all data protection and privacy guidelines</li>
        </ul>

        <h3 className="font-semibold mt-6">2. Access and Security</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your admin code grants full access to Pulse Connect systems</li>
          <li>All actions are logged and monitored</li>
          <li>Unauthorized access attempts will be investigated</li>
          <li>Regular security audits will be conducted</li>
        </ul>

        <h3 className="font-semibold mt-6">3. Data Protection</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Handle user data with utmost confidentiality</li>
          <li>Follow GDPR and other applicable privacy laws</li>
          <li>Do not export or download sensitive information unnecessarily</li>
          <li>Report any data breaches immediately</li>
        </ul>

        <h3 className="font-semibold mt-6">4. Code of Conduct</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Maintain professional behavior at all times</li>
          <li>Do not abuse admin privileges</li>
          <li>Respect user privacy</li>
          <li>Follow company policies and procedures</li>
        </ul>

        <h3 className="font-semibold mt-6">5. Termination</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>Admin access can be revoked at any time</li>
          <li>Violation of terms will result in immediate access termination</li>
          <li>Legal action may be taken for serious violations</li>
        </ul>
      </div>
    </div>
  );
}
