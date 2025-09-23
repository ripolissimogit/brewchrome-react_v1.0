import { useEffect, useState } from 'react';

interface ConsoleFooterProps {
  frontendVersion?: string;
  backendVersion?: string;
  backendStatus?: boolean;
}

export function ConsoleFooter({
  frontendVersion = "v3.1.1-hardening",
  backendVersion = "3.1.1",
  backendStatus = false
}: ConsoleFooterProps) {
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 8);
    setTimestamp(timeString);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 console-footer">
      <div className="max-w-6xl mx-auto space-y-1">
        <div>
          {timestamp}: BrewChrome ready (FE {frontendVersion})
        </div>
        {backendStatus && (
          <div>
            {timestamp}: Backend detected (BE {backendVersion})
          </div>
        )}
      </div>
    </div>
  );
}