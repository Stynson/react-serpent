import React from "react";
import ResizeObserver from "resize-observer-polyfill";
import Point from "./Point";

import SvgArrow from "./SvgArrow";

type Props = {
    arrowLength: number,
    arrowThickness: number,
    strokeColor: string,
    strokeWidth: number,
    strokeDasharray?: string,
    noCurves?: boolean,
    children: React$Node,
    style?: Object,
    svgContainerStyle?: Object,
    className?: string,
    offset?: number,
};

type SourceToTargetsArrayType = Array<SourceToTargetType>;

// For typing when munging sourceToTargetsMap
type JaggedSourceToTargetsArrayType = Array<SourceToTargetsArrayType>;

type State = {
    refs: {
        [string]: HTMLElement,
    },
    sourceToTargetsMap: {
        [string]: SourceToTargetsArrayType,
    },
    observer: ResizeObserver,
    parent: ?HTMLElement,
};

const defaultSvgContainerStyle = {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
};

function rectToPoint(rect: ClientRect) {
    return new Point(rect.left, rect.top);
}

function computeCoordinatesFromAnchorPosition(anchorPosition: AnchorPositionType, rect: ClientRect) {
    switch (anchorPosition) {
        case "top":
            return rectToPoint(rect).add(new Point(rect.width / 2, 0));
        case "bottom":
            return rectToPoint(rect).add(new Point(rect.width / 2, rect.height));
        case "left":
            return rectToPoint(rect).add(new Point(0, rect.height / 2));
        case "right":
            return rectToPoint(rect).add(new Point(rect.width, rect.height / 2));
        case "middle":
            return rectToPoint(rect).add(new Point(rect.width / 2, rect.height / 2));
        default:
            return new Point(0, 0);
    }
}

const ArcherContainerContext = React.createContext({});

export const ArcherContainerContextProvider = ArcherContainerContext.Provider;
export const ArcherContainerContextConsumer = ArcherContainerContext.Consumer;

export class ArcherContainer extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        const observer = new ResizeObserver(() => {
            this.refreshScreen();
        });

        this.state = {
            refs: {},
            sourceToTargetsMap: {},
            observer,
            parent: null,
        };
    }

    static defaultProps = {
        arrowLength: 0,
        arrowThickness: 0,
        strokeColor: "#f00",
        strokeWidth: 2,
        transparentStrokeWidth: 2,
        svgContainerStyle: {},
    };

    componentDidMount() {
        if (window) window.addEventListener("resize", this.refreshScreen);
    }

    componentWillUnmount() {
        const { observer } = this.state;

        Object.keys(this.state.refs).map(elementKey => {
            observer.unobserve(this.state.refs[elementKey]);
        });

        if (window) window.removeEventListener("resize", this.refreshScreen);
    }

    refreshScreen = (): void => {
        this.setState({ ...this.state });
    };

    storeParent = (ref: ?HTMLElement): void => {
        if (this.state.parent) return;

        this.setState(currentState => ({ ...currentState, parent: ref }));
    };

    getRectFromRef = (ref: ?HTMLElement): ?ClientRect => {
        if (!ref) return null;

        return ref.getBoundingClientRect();
    };

    getParentCoordinates = (): Point => {
        const rectp = this.getRectFromRef(this.state.parent);

        if (!rectp) {
            return new Point(0, 0);
        }
        return rectToPoint(rectp);
    };

    getPointCoordinatesFromAnchorPosition = (position: AnchorPositionType, index: string, parentCoordinates: Point): Point => {
        const rect = this.getRectFromRef(this.state.refs[index]);

        if (!rect) {
            return new Point(-1, -1);
        }
        const absolutePosition = computeCoordinatesFromAnchorPosition(position, rect);

        return absolutePosition.substract(parentCoordinates);
    };

    registerTransitions = (elementId: string, newSourceToTargets: Array<SourceToTargetType>): void => {
        this.setState((prevState: State) => ({
            sourceToTargetsMap: {
                ...prevState.sourceToTargetsMap,
                [elementId]: newSourceToTargets,
            },
        }));
    };

    unregisterTransitions = (elementId: string): void => {
        this.setState(currentState => {
            const sourceToTargetsMapCopy = { ...currentState.sourceToTargetsMap };
            delete sourceToTargetsMapCopy[elementId];
            return { sourceToTargetsMap: sourceToTargetsMapCopy };
        });
    };

    registerChild = (id: string, ref: HTMLElement): void => {
        if (!this.state.refs[id]) {
            this.state.observer.observe(ref);

            this.setState((currentState: State) => ({
                refs: { ...currentState.refs, [id]: ref },
            }));
        }
    };

    unregisterChild = (id: string): void => {
        this.setState((currentState: State) => {
            currentState.observer.unobserve(currentState.refs[id]);
            const newRefs = { ...currentState.refs };
            delete newRefs[id];
            return { refs: newRefs };
        });
    };

    getSourceToTargets = (): Array<SourceToTargetType> => {
        const { sourceToTargetsMap } = this.state;

        // Object.values is unavailable in IE11
        const jaggedSourceToTargets: JaggedSourceToTargetsArrayType = Object.keys(sourceToTargetsMap).map((key: string) => sourceToTargetsMap[key]);

        // Flatten
        return [].concat.apply([], jaggedSourceToTargets);
    };

    computeArrows = (): React$Node => {
        const parentCoordinates = this.getParentCoordinates();

        return this.getSourceToTargets()
            .filter(({ source, target }) => {
                const startingPoint = this.getPointCoordinatesFromAnchorPosition(source.anchor, source.id, parentCoordinates);
                const endingPoint = this.getPointCoordinatesFromAnchorPosition(target.anchor, target.id, parentCoordinates);
                return !((endingPoint.x === -1 && endingPoint.y === -1) || (startingPoint.x === -1 && startingPoint.y === -1));
            })
            .map(({ source, target, label, style }: SourceToTargetType) => {
                const strokeColor = (style && style.strokeColor) || this.props.strokeColor;

                const arrowLength = (style && style.arrowLength) || this.props.arrowLength;

                const strokeWidth = (style && style.strokeWidth) || this.props.strokeWidth;

                const transparentStrokeWidth = (style && style.transparentStrokeWidth) || this.props.transparentStrokeWidth;

                const strokeDasharray = (style && style.strokeDasharray) || this.props.strokeDasharray;

                const arrowThickness = (style && style.arrowThickness) || this.props.arrowThickness;

                const noCurves = (style && style.noCurves) || this.props.noCurves;

                const markerEnd = (style && style.markerEnd) || this.props.markerEnd;
                const markerStart = (style && style.markerStart) || this.props.markerStart;

                const offset = this.props.offset || 0;

                const startingAnchorOrientation = source.anchor;
                const startingPoint = this.getPointCoordinatesFromAnchorPosition(source.anchor, source.id, parentCoordinates);

                const endingAnchorOrientation = target.anchor;
                const endingPoint = this.getPointCoordinatesFromAnchorPosition(target.anchor, target.id, parentCoordinates);

                let onMouseEnter = () => {};
                if (this.props.onMouseEnter) onMouseEnter = e => this.props.onMouseEnter(e, source.id, target.id);
                let onMouseLeave = () => {};
                if (this.props.onMouseLeave) onMouseLeave = e => this.props.onMouseLeave(e, source.id, target.id);

                return (
                    <SvgArrow
                        key={JSON.stringify({ source, target })}
                        startingPoint={startingPoint}
                        startingAnchorOrientation={startingAnchorOrientation}
                        endingPoint={endingPoint}
                        endingAnchorOrientation={endingAnchorOrientation}
                        strokeColor={strokeColor}
                        arrowLength={arrowLength}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        transparentStrokeWidth={transparentStrokeWidth}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDasharray}
                        arrowLabel={label}
                        markerEnd={markerEnd}
                        markerStart={markerStart}
                        arrowThickness={arrowThickness}
                        noCurves={!!noCurves}
                        offset={offset}
                    />
                );
            });
    };

    svgContainerStyle = () => ({
        ...defaultSvgContainerStyle,
        ...this.props.svgContainerStyle,
    });

    render() {
        const SvgArrows = this.computeArrows();

        return (
            <ArcherContainerContextProvider
                value={{
                    registerTransitions: this.registerTransitions,
                    unregisterTransitions: this.unregisterTransitions,
                    registerChild: this.registerChild,
                    unregisterChild: this.unregisterChild,
                }}
            >
                <div style={{ ...this.props.style, position: "relative" }} className={this.props.className}>
                    <svg className="serpent-container" style={this.svgContainerStyle()}>
                        <marker id="circle" markerWidth="7" markerHeight="7" refX="1.5" refY="1.5" orient="auto">
                            <circle cx="1.5" cy="1.5" r="1.5" fill="white"></circle>
                        </marker>
                        <filter id="glow">
                            <feGaussianBlur class="blur" result="coloredBlur" stdDeviation="4"></feGaussianBlur>
                            <feMerge>
                                <feMergeNode in="coloredBlur"></feMergeNode>
                                <feMergeNode in="SourceGraphic"></feMergeNode>
                            </feMerge>
                        </filter>
                        {SvgArrows}
                    </svg>

                    <div style={{ height: "100%" }} ref={this.storeParent}>
                        {this.props.children}
                    </div>
                </div>
            </ArcherContainerContextProvider>
        );
    }
}

export default ArcherContainer;
