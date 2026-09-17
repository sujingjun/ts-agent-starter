export interface Place {
    id: string;
    name: string;
    capacity: number;
}
export interface Citizen {
    id: string;
    name: string;
    location: string;
    plan: string[];
    memory: string[];
}
/** 赛博小镇的无图形机制实验：观察、计划、行动、记忆，不包含原项目游戏引擎或美术。 */
export declare class TownSimulation {
    private tick;
    readonly places: Place[];
    readonly citizens: Citizen[];
    constructor(places: Place[], citizens: Citizen[]);
    step(): {
        tick: number;
        events: string[];
    };
}
export interface Visit {
    id: string;
    name: string;
    durationMinutes: number;
    cost: number;
    indoor: boolean;
}
/** 旅行案例的确定性约束检查：不把固定演示数据称为实时地图或天气。 */
export declare function planDay(visits: Visit[], limits: {
    minutes: number;
    budget: number;
    rainy: boolean;
}): {
    selected: Visit[];
    rejected: {
        id: string;
        reason: string;
    }[];
    minutes: number;
    cost: number;
    dataMode: string;
};
