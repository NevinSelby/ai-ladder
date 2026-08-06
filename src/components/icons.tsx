import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  /** ColorValue rather than string so navigator-supplied tint colors fit. */
  color: ColorValue;
  size?: number;
}

const S = ({ color, size = 24, children }: IconProps & { children: React.ReactNode }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round">
    {children}
  </Svg>
);

/** Today: a target, because the daily session is the one thing to hit. */
export const IconToday = (props: IconProps) => (
  <S {...props}>
    <Circle cx={12} cy={12} r={8.5} />
    <Circle cx={12} cy={12} r={4} />
    <Circle cx={12} cy={12} r={0.8} fill={props.color} />
  </S>
);

/** Board: stacked account cards. */
export const IconBoard = (props: IconProps) => (
  <S {...props}>
    <Rect x={3.5} y={4} width={7} height={7} rx={1.6} />
    <Rect x={13.5} y={4} width={7} height={11} rx={1.6} />
    <Rect x={3.5} y={13} width={7} height={7} rx={1.6} />
    <Rect x={13.5} y={17} width={7} height={3} rx={1.4} />
  </S>
);

/** Practice: a split path, one choice each way. */
export const IconPractice = (props: IconProps) => (
  <S {...props}>
    <Path d="M12 20.5V13" />
    <Path d="M12 13 5.5 8.2" />
    <Path d="M12 13l6.5-4.8" />
    <Circle cx={5.5} cy={6} r={2.4} />
    <Circle cx={18.5} cy={6} r={2.4} />
    <Circle cx={12} cy={21} r={1.6} />
  </S>
);

/** Progress: the pentagon radar, echoing the five meters. */
export const IconProgress = (props: IconProps) => (
  <S {...props}>
    <Path d="M12 3.2 20.3 9.3 17.1 19.1H6.9L3.7 9.3z" />
    <Path d="M12 8.2l4.2 3.1-1.6 5H9.4l-1.6-5z" opacity={0.6} />
  </S>
);

/** Learn: an open book, the theory half of the ladder. */
export const IconLearn = (props: IconProps) => (
  <S {...props}>
    <Path d="M12 7.2C10.6 6 8.8 5.4 6.6 5.4H3.6v12.2h3c2.2 0 4 .6 5.4 1.8" />
    <Path d="M12 7.2c1.4-1.2 3.2-1.8 5.4-1.8h3v12.2h-3c-2.2 0-4 .6-5.4 1.8" />
    <Path d="M12 7.2v12.2" />
  </S>
);

/** Ladder: the app mark, used on the empty and celebration states. */
export const IconLadder = (props: IconProps) => (
  <S {...props}>
    <Path d="M4.5 19.5 8 4.5M15.5 19.5 19 4.5" />
    <Path d="M6.6 15.4h9.6M7.4 11.6H17M8.2 7.8h9.6" />
  </S>
);

export const IconFlame = (props: IconProps) => (
  <S {...props}>
    <Path d="M12 21c3.6 0 6-2.3 6-5.4 0-3.6-3-5-4.2-8.6-.3-.9-1.5-.9-1.8 0-.6 1.8-1.7 2.6-2.7 3.6C7.6 12 6 13.3 6 15.6 6 18.7 8.4 21 12 21z" />
    <Path d="M12 21c1.7 0 2.9-1.1 2.9-2.7 0-1.8-1.5-2.6-2-4.3-.2-.5-.9-.5-1.1 0-.4 1.3-1.8 1.9-1.8 4.3 0 1.6 1.2 2.7 2 2.7z" opacity={0.55} />
  </S>
);

/** Points: a faceted gem, the spendable currency as distinct from XP. */
export const IconGem = (props: IconProps) => (
  <S {...props}>
    <Path d="M7 3.5h10l4 5.5-9 11.5L3 9l4-5.5Z" />
    <Path d="M3 9h18" />
    <Path d="M9.5 9 12 20.5 14.5 9" />
    <Path d="m7 3.5 2.5 5.5L12 3.5l2.5 5.5L17 3.5" />
  </S>
);

/** Trophy: the leaderboard. */
export const IconTrophy = (props: IconProps) => (
  <S {...props}>
    <Path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
    <Path d="M8 5.5H5.5a0 0 0 0 0 0 0c0 2.8 1 4.5 2.5 5" />
    <Path d="M16 5.5h2.5c0 2.8-1 4.5-2.5 5" />
    <Path d="M12 14v3.5" />
    <Path d="M8.5 20.5h7" />
    <Path d="M10 17.5h4v3h-4z" />
  </S>
);

/** Quest scroll: a checklist. */
export const IconQuest = (props: IconProps) => (
  <S {...props}>
    <Rect x={4.5} y={3.5} width={15} height={17} rx={2.5} />
    <Path d="m8 8.5 1.5 1.5L12 7.5" />
    <Path d="M14.5 9h2" />
    <Path d="m8 14.5 1.5 1.5 2.5-2.5" />
    <Path d="M14.5 15h2" />
  </S>
);

export const IconArrowLeft = (props: IconProps) => (
  <S {...props}>
    <Path d="M19 12H6" />
    <Path d="m11.5 6-6 6 6 6" />
  </S>
);

export const IconArrowRight = (props: IconProps) => (
  <S {...props}>
    <Path d="M5 12h13" />
    <Path d="m12.5 6 6 6-6 6" />
  </S>
);

export const IconCheck = (props: IconProps) => (
  <S {...props}>
    <Path d="m5 12.5 4.5 4.5L19 7" />
  </S>
);

export const IconCross = (props: IconProps) => (
  <S {...props}>
    <Path d="M6 6l12 12M18 6 6 18" />
  </S>
);

export const IconEye = (props: IconProps) => (
  <S {...props}>
    <Path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z" />
    <Circle cx={12} cy={12} r={3} />
  </S>
);

export const IconEyeOff = (props: IconProps) => (
  <S {...props}>
    <Path d="M4 4l16 16" />
    <Path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c5.8 0 9.2 6 9.2 6a17.5 17.5 0 0 1-2.5 3.2M6.4 6.9C4.1 8.6 2.8 12 2.8 12s3.4 6.2 9.2 6.2c1.3 0 2.5-.3 3.6-.8" />
    <Path d="M9.9 10.1a3 3 0 0 0 4.1 4.1" />
  </S>
);

export const IconUser = (props: IconProps) => (
  <S {...props}>
    <Circle cx={12} cy={8} r={3.6} />
    <Path d="M5.2 19.4c.9-3.2 3.6-4.9 6.8-4.9s5.9 1.7 6.8 4.9" />
  </S>
);

export const IconInfo = (props: IconProps) => (
  <S {...props}>
    <Circle cx={12} cy={12} r={8.6} />
    <Path d="M12 11.2v5" />
    <Path d="M12 8.1h.01" />
  </S>
);

export const IconLock = (props: IconProps) => (
  <S {...props}>
    <Rect x={4.5} y={10.5} width={15} height={9.5} rx={2.2} />
    <Path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
  </S>
);

export const IconLink = (props: IconProps) => (
  <S {...props}>
    <Path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
    <Path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.3-1.3" />
  </S>
);
