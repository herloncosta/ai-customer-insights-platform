import FeedbackForm from '../components/FeedbackForm';

export default function NewFeedbackScreen({
  onCreated,
}: {
  onCreated: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <FeedbackForm onCreated={onCreated} />
    </div>
  );
}
