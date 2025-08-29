import { BlockPathType, type Size } from '$lib/types';

export function generatePathString(
	pathType: BlockPathType,
	size: Size,
	loopHeight: number = 0
): string {
	let setWidth = size.width - 2.0;
	let value = {
		width: setWidth + 4,
		height: size.height,
		rad: size.height / 2
	};

	switch (pathType) {
		case BlockPathType.Flag:
			return `M 14 2 L 42 2 L ${setWidth - 14.0} 2 Q ${setWidth} 2 ${setWidth} 14 L ${setWidth} ${
				size.height - 18.0
			} Q ${setWidth} ${size.height - 14.0} ${setWidth - 4.0} ${
				size.height - 14.0
			} L 40 ${size.height - 14.0} L 40 ${size.height - 10.0} Q 40 ${
				size.height - 8.0
			} 36 ${size.height - 8.0} L 20 ${size.height - 8.0} Q 16 ${
				size.height - 8.0
			} 16 ${size.height - 10.0} L 16 ${size.height - 14.0} L 4 ${
				size.height - 14.0
			} Q 2 ${size.height - 14.0} 2 ${size.height - 18.0} L 2 14 Q 2 2 14 2 Z`;

		case BlockPathType.Works:
		case BlockPathType.Move:
		case BlockPathType.Composition:
			return `M 4 2 L 14 2 L 14 4 Q 14 8 20 8 L 38 8 Q 42 8 42 4 L 42 2 L ${
				setWidth - 4.0
			} 2 Q ${setWidth} 2 ${setWidth} 4 L ${setWidth} ${
				size.height - 18.0
			} Q ${setWidth} ${size.height - 14.0} ${setWidth - 4.0} ${
				size.height - 14.0
			} L 40 ${size.height - 14.0} L 40 ${size.height - 10.0} Q 40 ${
				size.height - 8.0
			} 36 ${size.height - 8.0} L 20 ${size.height - 8.0} Q 16 ${
				size.height - 8.0
			} 16 ${size.height - 10.0} L 16 ${size.height - 14.0} L 4 ${
				size.height - 14.0
			} Q 2 ${size.height - 14.0} 2 ${size.height - 18.0} L 2 4 Q 2 2 4 2 Z`;

		case BlockPathType.Loop:
			return `M 4 2 L 14 2 L 14 4 Q 14 8 20 8 L 38 8 Q 42 8 42 4 L 42 2 L ${
				setWidth - 4.0
			} 2 Q ${setWidth} 2 ${setWidth} 4 L ${setWidth} ${
				size.height - 18.0
			} Q ${setWidth} ${size.height - 14.0} ${setWidth - 4.0} ${
				size.height - 14.0
			} L 48 ${size.height - 14.0} L 48 ${size.height - 10.0} Q 48 ${
				size.height - 8.0
			} 44 ${size.height - 8.0} L 28 ${size.height - 8.0} Q 24 ${
				size.height - 8.0
			} 24 ${size.height - 10.0} L 24 ${size.height - 14.0} L 12 ${
				size.height - 14.0
			} Q 8 ${size.height - 14.0} 8 ${size.height - 10.0} L 8 ${
				size.height + loopHeight - 4.0 - 8.0
			} Q 8 ${size.height + loopHeight - 8.0} 14 ${
				size.height + loopHeight - 8.0
			} L ${setWidth - 4.0} ${size.height + loopHeight - 8.0} Q ${setWidth} ${
				size.height + loopHeight - 8.0
			} ${setWidth} ${size.height + loopHeight + 4.0 - 8.0} L ${setWidth} ${
				size.height + loopHeight + 11.0 - 8.0
			} Q ${setWidth} ${size.height + loopHeight + 15.0 - 8.0} ${
				setWidth - 4.0
			} ${size.height + loopHeight + 15.0 - 8.0} L 40 ${
				size.height + loopHeight + 15.0 - 8.0
			} L 40 ${size.height + loopHeight + 15.0 - 8.0 + 4.0} Q 40 ${
				size.height + loopHeight + 15.0 - 8.0 + 4.0 + 2.0
			} 36 ${size.height + loopHeight + 15.0 - 8.0 + 4.0 + 2.0} L 20 ${
				size.height + loopHeight + 15.0 - 8.0 + 4.0 + 2.0
			} Q 16 ${size.height + loopHeight + 15.0 - 8.0 + 4.0 + 2.0} 16 ${
				size.height + loopHeight + 15.0 - 8.0 + 4.0
			} L 16 ${size.height + loopHeight + 15.0 - 8.0} L 4 ${
				size.height + loopHeight + 15.0 - 8.0
			} Q 2 ${size.height + loopHeight + 15.0 - 8.0} 2 ${
				size.height + loopHeight + 11.0 - 8.0
			} L 2 4 Q 2 2 4 2 Z`;

		case BlockPathType.Value:
			return `M ${value.rad} 2 L ${value.width - value.rad} 2 Q ${
				value.width
			} 2 ${value.width} ${value.rad} L ${value.width} ${value.rad} Q ${
				value.width
			} ${value.height} ${value.width - value.rad} ${value.height} L ${
				value.rad
			} ${value.height} Q 2 ${value.height} 2 ${value.rad} L 2 ${value.rad} Q 2 2 ${value.rad} 2 Z`;

		default:
			return `M 4 2 L ${setWidth - 4.0} 2 Q ${setWidth} 2 ${setWidth} 4 L ${setWidth} ${
				size.height - 4.0
			} Q ${setWidth} ${size.height} ${setWidth - 4.0} ${size.height} L 4 ${
				size.height
			} Q 2 ${size.height} 2 ${size.height - 4.0} L 2 4 Q 2 2 4 2 Z`;
	}
}

export function getBlockColors(pathType: BlockPathType): {
	fill: string;
	stroke: string;
	shadow: string;
} {
	switch (pathType) {
		case BlockPathType.Flag:
			return {
				fill: '#F56A64',
				stroke: '#E9453E',
				shadow: '#E9453E'
			};
		case BlockPathType.Works:
		case BlockPathType.Move:
			return {
				fill: '#2885DB',
				stroke: '#0067C5',
				shadow: '#0067C5'
			};
		case BlockPathType.Loop:
			return {
				fill: '#F3AC00',
				stroke: '#EE9300',
				shadow: '#EE9300'
			};
		case BlockPathType.Composition:
			return {
				fill: '#4ECDC4',
				stroke: '#3BB3AA',
				shadow: '#3BB3AA'
			};
		case BlockPathType.Value:
			return {
				fill: '#4DD75C',
				stroke: '#00BA14',
				shadow: '#00BA14'
			};
		default:
			return {
				fill: '#5A8DEE',
				stroke: '#3A6BC1',
				shadow: '#3A6BC1'
			};
	}
}
