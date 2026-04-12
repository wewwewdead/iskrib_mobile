import React from 'react';
import Svg, {Path, Line, Polyline, Rect} from 'react-native-svg';

export interface EditorIconProps {
  size?: number;
  color?: string;
}

const D = {size: 20, color: '#888'};

// Wrapper for consistent viewBox
function S({
  size = D.size,
  color = D.color,
  children,
}: EditorIconProps & {children: React.ReactNode}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function UndoIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Polyline points="1 4 1 10 7 10" stroke={color ?? D.color} />
      <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke={color ?? D.color} />
    </S>
  );
}

export function RedoIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Polyline points="23 4 23 10 17 10" stroke={color ?? D.color} />
      <Path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" stroke={color ?? D.color} />
    </S>
  );
}

export function BoldIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke={color ?? D.color} />
      <Path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" stroke={color ?? D.color} />
    </S>
  );
}

export function ItalicIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="19" y1="4" x2="10" y2="4" stroke={color ?? D.color} />
      <Line x1="14" y1="20" x2="5" y2="20" stroke={color ?? D.color} />
      <Line x1="15" y1="4" x2="9" y2="20" stroke={color ?? D.color} />
    </S>
  );
}

export function UnderlineIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" stroke={color ?? D.color} />
      <Line x1="4" y1="21" x2="20" y2="21" stroke={color ?? D.color} />
    </S>
  );
}

export function StrikethroughIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color ?? D.color} />
      <Path d="M17.5 7.5c0-2-1.5-3.5-5.5-3.5S6.5 5.5 6.5 7.5c0 2 1.5 3 5.5 4.5" stroke={color ?? D.color} />
      <Path d="M6.5 16.5c0 2 1.5 3.5 5.5 3.5s5.5-1.5 5.5-3.5c0-1.5-1-2.5-3-3.5" stroke={color ?? D.color} />
    </S>
  );
}

export function CodeIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Polyline points="16 18 22 12 16 6" stroke={color ?? D.color} />
      <Polyline points="8 6 2 12 8 18" stroke={color ?? D.color} />
    </S>
  );
}

export function Heading1Icon({size = D.size, color = D.color}: EditorIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18 19V9l-2 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Heading2Icon({size = D.size, color = D.color}: EditorIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17.5 9.5a2.5 2.5 0 0 1 4 2c0 1.5-4 4-4 4h4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Heading3Icon({size = D.size, color = D.color}: EditorIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 5v14" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 9h4l-2.5 3.5a2.5 2.5 0 1 1-1.5 4.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function QuoteIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" stroke={color ?? D.color} fill="none" />
      <Path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" stroke={color ?? D.color} fill="none" />
    </S>
  );
}

export function BulletListIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="8" y1="6" x2="21" y2="6" stroke={color ?? D.color} />
      <Line x1="8" y1="12" x2="21" y2="12" stroke={color ?? D.color} />
      <Line x1="8" y1="18" x2="21" y2="18" stroke={color ?? D.color} />
      <Line x1="3" y1="6" x2="3.01" y2="6" stroke={color ?? D.color} strokeWidth={3} />
      <Line x1="3" y1="12" x2="3.01" y2="12" stroke={color ?? D.color} strokeWidth={3} />
      <Line x1="3" y1="18" x2="3.01" y2="18" stroke={color ?? D.color} strokeWidth={3} />
    </S>
  );
}

export function NumberedListIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="10" y1="6" x2="21" y2="6" stroke={color ?? D.color} />
      <Line x1="10" y1="12" x2="21" y2="12" stroke={color ?? D.color} />
      <Line x1="10" y1="18" x2="21" y2="18" stroke={color ?? D.color} />
      <Path d="M4 6h1v4" stroke={color ?? D.color} strokeWidth={1.5} />
      <Path d="M3 16h3l-2.5-3a1.5 1.5 0 1 1 2.5-1" stroke={color ?? D.color} strokeWidth={1.5} fill="none" />
    </S>
  );
}

export function HorizontalRuleIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color ?? D.color} />
    </S>
  );
}

export function LinkIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color ?? D.color} />
      <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color ?? D.color} />
    </S>
  );
}

export function AlignLeftIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="17" y1="10" x2="3" y2="10" stroke={color ?? D.color} />
      <Line x1="21" y1="6" x2="3" y2="6" stroke={color ?? D.color} />
      <Line x1="21" y1="14" x2="3" y2="14" stroke={color ?? D.color} />
      <Line x1="17" y1="18" x2="3" y2="18" stroke={color ?? D.color} />
    </S>
  );
}

export function AlignCenterIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="18" y1="10" x2="6" y2="10" stroke={color ?? D.color} />
      <Line x1="21" y1="6" x2="3" y2="6" stroke={color ?? D.color} />
      <Line x1="21" y1="14" x2="3" y2="14" stroke={color ?? D.color} />
      <Line x1="18" y1="18" x2="6" y2="18" stroke={color ?? D.color} />
    </S>
  );
}

export function AlignRightIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Line x1="21" y1="10" x2="7" y2="10" stroke={color ?? D.color} />
      <Line x1="21" y1="6" x2="3" y2="6" stroke={color ?? D.color} />
      <Line x1="21" y1="14" x2="3" y2="14" stroke={color ?? D.color} />
      <Line x1="21" y1="18" x2="7" y2="18" stroke={color ?? D.color} />
    </S>
  );
}

export function ImageUploadIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color ?? D.color} />
      <Path d="M8.5 8.5a1.5 1.5 0 1 0 0 .01" stroke={color ?? D.color} fill={color ?? D.color} />
      <Polyline points="21 15 16 10 5 21" stroke={color ?? D.color} />
    </S>
  );
}

export function KeyboardHideIcon({size, color}: EditorIconProps) {
  return (
    <S size={size} color={color}>
      <Path d="M20 3H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z" stroke={color ?? D.color} />
      <Polyline points="8 21 12 17 16 21" stroke={color ?? D.color} />
    </S>
  );
}
