export function SetupNotice() {
  return (
    <div className="card pad setupcard">
      <h1>Login er ikke sat op endnu</h1>
      <p className="lead">
        Skæreplanen virker stadig uden konto. For at slå tilmelding og gemte skæresedler til skal Clerk-nøglerne
        sættes, og appen skal deployes igen.
      </p>
      <div className="notice">
        Tilføj <span className="mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span> og{' '}
        <span className="mono">CLERK_SECRET_KEY</span> i Vercel-projektet <strong>pladeplan</strong>. Se README.
      </div>
      <div className="accountactions">
        <a className="btn primary" href="/">
          Tilbage til skæreplanen
        </a>
      </div>
    </div>
  );
}
