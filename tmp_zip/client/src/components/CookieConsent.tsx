import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(localStorage.getItem("iqcare-consent") !== "accepted"); }, []);
  if (!visible) return null;
  const accept = () => { localStorage.setItem("iqcare-consent", "accepted"); setVisible(false); };
  return <div className="cookie-banner" role="dialog" aria-label="Privacy choices"><div><strong>Privacy first.</strong><p>iQcare uses essential local state for the demo. Optional analytics stays off until you choose.</p></div><div className="cookie-actions"><button onClick={() => { localStorage.setItem("iqcare-consent", "declined"); setVisible(false); }}>Decline</button><button className="cookie-accept" onClick={accept}>Accept optional analytics</button></div></div>;
}
