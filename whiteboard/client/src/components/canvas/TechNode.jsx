import { Group, Rect, Text, Circle } from 'react-konva';

export const TECH_NODE_PRESETS = {
  client: {
    techType: 'client',
    badge: 'CLIENT',
    label: 'Web / Mobile Client',
    subtitle: 'Browser, iOS, Android',
    accent: '#38BDF8',
    width: 180,
    height: 84,
  },
  'api-gateway': {
    techType: 'api-gateway',
    badge: 'API GATEWAY',
    label: 'API Gateway',
    subtitle: 'Auth, Rate Limit, Routing',
    accent: '#A855F7',
    width: 180,
    height: 84,
  },
  server: {
    techType: 'server',
    badge: 'SERVICE',
    label: 'App Server',
    subtitle: 'Node / Microservice',
    accent: '#22C55E',
    width: 180,
    height: 84,
  },
  database: {
    techType: 'database',
    badge: 'DATABASE',
    label: 'Primary DB',
    subtitle: 'PostgreSQL / MongoDB',
    accent: '#F59E0B',
    width: 180,
    height: 84,
  },
  cache: {
    techType: 'cache',
    badge: 'CACHE',
    label: 'Redis Cache',
    subtitle: 'In-Memory Store',
    accent: '#EF4444',
    width: 180,
    height: 84,
  },
  queue: {
    techType: 'queue',
    badge: 'QUEUE',
    label: 'Message Queue',
    subtitle: 'Kafka / RabbitMQ',
    accent: '#EC4899',
    width: 180,
    height: 84,
  },
};

export default function TechNode({
  element,
  isSelected,
  isDraggable,
  showPorts,
  onSelect,
  onDragMove,
  onDragEnd,
  onDblClick,
  onTransformEnd,
}) {
  const preset = TECH_NODE_PRESETS[element.techType] || TECH_NODE_PRESETS.server;
  const width = element.width || preset.width;
  const height = element.height || preset.height;
  const accent = element.stroke || preset.accent;
  const bgFill = element.fill || '#0F172A';

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={isDraggable}
      onClick={(e) => onSelect(e, element)}
      onTap={(e) => onSelect(e, element)}
      onDblClick={(e) => onDblClick(e, element)}
      onDblTap={(e) => onDblClick(e, element)}
      onDragMove={(e) => onDragMove(e, element)}
      onDragEnd={(e) => onDragEnd(e, element)}
      onTransformEnd={(e) => onTransformEnd(e, element)}
    >
      {/* Card Container */}
      <Rect
        width={width}
        height={height}
        fill={bgFill}
        stroke={isSelected ? '#60A5FA' : accent}
        strokeWidth={isSelected ? 2.5 : 1.5}
        cornerRadius={10}
        shadowColor="#000000"
        shadowBlur={isSelected ? 16 : 8}
        shadowOpacity={0.35}
        shadowOffsetY={4}
      />

      {/* Top Accent Strip */}
      <Rect
        x={1}
        y={1}
        width={width - 2}
        height={6}
        fill={accent}
        cornerRadius={[9, 9, 0, 0]}
        listening={false}
      />

      {/* Category Badge */}
      <Rect
        x={12}
        y={16}
        width={Math.min(width - 24, preset.badge.length * 7 + 14)}
        height={18}
        fill={`${accent}26`}
        cornerRadius={4}
        listening={false}
      />
      <Text
        x={18}
        y={20}
        text={preset.badge}
        fontSize={9}
        fontStyle="bold"
        fill={accent}
        letterSpacing={0.6}
        listening={false}
      />

      {/* Node Title */}
      <Text
        x={12}
        y={40}
        width={width - 24}
        text={element.label || preset.label}
        fontSize={13}
        fontStyle="bold"
        fill="#F8FAFC"
        ellipsis={true}
        wrap="none"
        listening={false}
      />

      {/* Node Subtitle / Note */}
      <Text
        x={12}
        y={60}
        width={width - 24}
        text={element.subtitle ?? preset.subtitle}
        fontSize={10.5}
        fill="#94A3B8"
        ellipsis={true}
        wrap="none"
        listening={false}
      />

      {/* Connection Ports (visible on selection or when Arrow tool is active) */}
      {(isSelected || showPorts) && (
        <>
          <Circle x={width / 2} y={0} radius={4} fill={accent} stroke="#0F172A" strokeWidth={1.5} listening={false} />
          <Circle x={width} y={height / 2} radius={4} fill={accent} stroke="#0F172A" strokeWidth={1.5} listening={false} />
          <Circle x={width / 2} y={height} radius={4} fill={accent} stroke="#0F172A" strokeWidth={1.5} listening={false} />
          <Circle x={0} y={height / 2} radius={4} fill={accent} stroke="#0F172A" strokeWidth={1.5} listening={false} />
        </>
      )}
    </Group>
  );
}