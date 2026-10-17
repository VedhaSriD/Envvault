// Wraps a section so its background sits behind the content.
// Children are the content; `backdrop` is one of the pixel layers below.
export default function SectionBackdrop({ backdrop, className = "", children, id }) {
  return (
    <div className={`bd-wrap ${className}`.trim()} id={id}>
      <div className="bd-layer" aria-hidden="true">
        {backdrop}
      </div>
      <div className="bd-content">{children}</div>
    </div>
  );
}