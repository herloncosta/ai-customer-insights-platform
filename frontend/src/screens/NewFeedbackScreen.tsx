import FeedbackForm from '../components/FeedbackForm';

export default function NewFeedbackScreen({ onCreated }: { onCreated: () => void }) {
  return (
    <div className="w-full">
      <FeedbackForm onCreated={onCreated} />
    </div>
  );
}
