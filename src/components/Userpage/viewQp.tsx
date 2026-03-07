"use client";

export default function QPViewer({
  session,
  textSubmitted
}: {
  session: any;
  textSubmitted: boolean;
}) {
  // Return empty fragment if text is not submitted yet
  if (!textSubmitted) {
    return <></>;
  }

  // Determine the set based on the hall ticket
  const hallticket = session?.user?.hallticket || "";
  let isAlternate = false;

  if (hallticket) {
    const lastChar = hallticket.slice(-1);
    const num = parseInt(lastChar, 10);
    // If the last character is a number, use odd/even. Otherwise use char code.
    if (!isNaN(num)) {
      isAlternate = num % 2 !== 0;
    } else {
      isAlternate = hallticket.charCodeAt(hallticket.length - 1) % 2 !== 0;
    }
  }

  const setPdfUrl = isAlternate ? "/SET-B.pdf" : "/SET-A.pdf";

  return (
    <div className="flex-1 h-full border-r border-gray-300 overflow-hidden break-all">
      <iframe 
        src={`${setPdfUrl}#toolbar=0&navpanes=0`}
        className="w-full h-full border-0" 
        title="Question Paper"
      />
    </div>
  );
}