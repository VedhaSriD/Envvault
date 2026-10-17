// Two pixel panels that part slightly when `open` is true.
export default function VaultDoor({ open = false }) {
  return (
    <div className={`bd-vault ${open ? "is-open" : ""}`.trim()}>
      <div className="bd-vault-left" />
      <div className="bd-vault-right" />
      <div className="bd-vault-wheel" />
    </div>
  );
}