export function DeletedBanner() {
  return (
    <div className="deletedbar" role="status">
      <span>Din konto er slettet. Skæresedler på serveren er fjernet, og Pladeplan gemmer ingen kopi.</span>
      <a className="btn small" href="/">
        Luk
      </a>
    </div>
  );
}
