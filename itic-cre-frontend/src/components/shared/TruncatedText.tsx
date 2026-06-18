interface Props {
    text: string;
    className?: string;
}

export default function TruncatedText({ text, className = '' }: Props) {
    return (
        <span className={`block truncate ${className}`} title={text}>
            {text}
        </span>
    );
}
