import EmojiPicker from "emoji-picker-react";
import { Smiley } from "@phosphor-icons/react";

const APPLE_EMOJI_CDN =
  "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/";
const QUICK_REACTIONS = [
  { emoji: "👍", unified: "1f44d" },
  { emoji: "❤️", unified: "2764-fe0f" },
  { emoji: "😂", unified: "1f602" },
  { emoji: "😮", unified: "1f62e" },
  { emoji: "😢", unified: "1f622" },
  { emoji: "🙏", unified: "1f64f" },
];

function emojiUnified(emoji) {
  return Array.from(emoji)
    .map((character) => character.codePointAt(0).toString(16))
    .join("-");
}

function emojiSource(unified) {
  return `${APPLE_EMOJI_CDN}${unified}.png`;
}

export default function MessageReactions({
  message,
  isPickerOpen,
  isQuickPickerOpen,
  onReact,
  onTogglePicker,
  onToggleQuickPicker,
}) {
  const messageID = message.public_id;

  return (
    <span className="chat-message__reactions">
      {message.reactions?.map((reaction) => (
        <button
          key={`${reaction.user_id}-${reaction.emoji}`}
          className="chat-message__reaction"
          type="button"
          onClick={() => onReact(messageID, reaction.emoji)}
          aria-label={`Remove ${reaction.emoji} reaction`}
        >
          <img
            src={emojiSource(emojiUnified(reaction.emoji))}
            alt={reaction.emoji}
          />
        </button>
      ))}

      <button
        type="button"
        onClick={() => onToggleQuickPicker(messageID)}
        aria-label="React to message"
      >
        <Smiley size={15} />
      </button>

      {isQuickPickerOpen && (
        <div className="chat-message__quick-reactions">
          {QUICK_REACTIONS.map(({ emoji, unified }) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(messageID, emoji)}
            >
              <img src={emojiSource(unified)} alt={emoji} />
            </button>
          ))}
          <button
            type="button"
            className="chat-message__quick-plus"
            onClick={() => onTogglePicker(messageID)}
          >
            +
          </button>
        </div>
      )}

      {isPickerOpen && (
        <div className="chat-message__picker">
          <EmojiPicker
            theme="dark"
            emojiStyle="apple"
            width={300}
            height={320}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
            onEmojiClick={(emojiData) => onReact(messageID, emojiData.emoji)}
          />
        </div>
      )}
    </span>
  );
}
