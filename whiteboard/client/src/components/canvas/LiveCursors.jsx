import { Group, Line, Rect, Text } from 'react-konva';

export default function LiveCursors({ cursors = {}, activePageId, stageScale = 1 }) {
  const inverseScale = 1 / Math.max(stageScale, 0.1);

  const visibleCursors = Object.values(cursors).filter(
    (cursor) =>
      cursor &&
      typeof cursor.x === 'number' &&
      typeof cursor.y === 'number' &&
      cursor.pageId === activePageId
  );

  return (
    <>
      {visibleCursors.map((cursor) => {
        const label = cursor.userName || 'Guest';
        const color = cursor.color || '#3B82F6';
        const tagWidth = Math.max(48, label.length * 6.8 + 16);

        return (
          <Group
            key={cursor.socketId}
            x={cursor.x}
            y={cursor.y}
            scaleX={inverseScale}
            scaleY={inverseScale}
            listening={false}
          >
            {/* Pointer Arrow */}
            <Line
              points={[0, 0, 0, 17, 5, 13, 9, 20, 11.5, 18.8, 7.5, 12, 13, 12]}
              closed
              fill={color}
              stroke="#0F172A"
              strokeWidth={1.2}
              lineJoin="round"
            />

            {/* Collaborator Name Pill */}
            <Group x={12} y={14}>
              <Rect
                width={tagWidth}
                height={20}
                fill={color}
                cornerRadius={6}
                shadowColor="#000000"
                shadowBlur={6}
                shadowOpacity={0.35}
                shadowOffsetY={2}
              />
              <Text
                x={8}
                y={4.5}
                text={label}
                fontSize={11}
                fontStyle="bold"
                fill="#FFFFFF"
                width={tagWidth - 16}
                ellipsis={true}
                wrap="none"
              />
            </Group>
          </Group>
        );
      })}
    </>
  );
}