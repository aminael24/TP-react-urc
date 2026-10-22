
const emojis = ["❤️", "😂", "👍", "😮"];

type Props = {
    reactions: Record<string, number>;
    onReact: (emoji: string) => void;
};

export default function ReactionBar({
                                        reactions,
                                        onReact,
                                    }: Props) {
    return (
        <div className="reaction-bar">
            {emojis.map((emoji) => (
                <button
                    type="button"
                    key={emoji}
                    onClick={() => onReact(emoji)}
                >
                    {emoji}
                    {reactions[emoji] > 0
                        ? ` ${reactions[emoji]}`
                        : ""}
                </button>
            ))}
        </div>
    );
}
