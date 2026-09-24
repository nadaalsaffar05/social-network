import EmojiPicker from "emoji-picker-react";

export default function ChatEmojiPicker({
  onEmojiSelect,
  width = 300,
  height = 320,
}) {
  return (
    <EmojiPicker
      theme="dark"
      emojiStyle="apple"
      width={width}
      height={height}
      skinTonesDisabled
      previewConfig={{ showPreview: false }}
      searchPlaceHolder="Find the perfect emoji"
      onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
    />
  );
}
