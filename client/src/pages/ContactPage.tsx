import { Link } from 'react-router-dom';

export default function ContactPage() {
  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">Contact</h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        Need help or want to share feedback? Reach out using the options below.
      </p>

      <div className="space-y-5">
        {/* Support email */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-200">
            Email Support
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Have a question or found a bug? Send us an email and we'll get back to you as soon as
            possible.
          </p>
          <a
            href="mailto:support@welltrack.app"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            support@welltrack.app
          </a>
        </div>

        {/* Help resources */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-200">
            Help Resources
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Check our FAQ for answers to common questions before reaching out.
          </p>
          <Link
            to="/help"
            className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
          >
            View the Help page →
          </Link>
        </div>

        {/* Feedback */}
        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-gray-700 dark:text-gray-200">
            Feature Requests & Feedback
          </h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Have an idea to improve WellTrack? We'd love to hear it. Send your suggestions to the
            same support address.
          </p>
          <a
            href="mailto:feedback@welltrack.app"
            className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
          >
            feedback@welltrack.app
          </a>
        </div>
      </div>
    </div>
  );
}
