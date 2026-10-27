/*
SectionError.tsx — what a section shows when its request FAILED (#42).
A short message saying what couldn't load, and a Try again button.
Shared by LiveMatches, TopScorers, Standings and the Champions League page,
so every error on the site looks and works the same way.
*/

// defines what props this component accepts
interface SectionErrorProps {
  message: string                                   // what failed, e.g. "Couldn't load standings right now."
  onRetry: () => void                               // the function to run when Try again is clicked — it fetches again
}

function SectionError({ message, onRetry }: SectionErrorProps) {
  return (
    // role="alert" tells screen readers to announce this message as soon as it appears
    <div className="section-error" role="alert">
      <p>{message}</p>
      <button className="predict-btn" onClick={onRetry}>Try again</button>
    </div>
  )
}

// export default makes SectionError importable in other components
export default SectionError

