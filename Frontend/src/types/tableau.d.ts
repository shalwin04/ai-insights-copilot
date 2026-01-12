// Declare tableau-viz web component for TypeScript
declare namespace JSX {
  interface IntrinsicElements {
    "tableau-viz": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        width?: string;
        height?: string;
        toolbar?: string;
        "hide-tabs"?: string;
      },
      HTMLElement
    >;
  }
}
