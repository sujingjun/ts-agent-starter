import { invariant } from './errors.js';
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
export class TownSimulation {
    private tick = 0;
    readonly places: Place[];
    readonly citizens: Citizen[];
    constructor(places: Place[], citizens: Citizen[]) { invariant(new Set(places.map(p => p.id)).size === places.length, 'TOWN_PLACE', '场所重复'); this.places = structuredClone(places); this.citizens = structuredClone(citizens); }
    step(): {
        tick: number;
        events: string[];
    } {
        this.tick++;
        const events: string[] = [];
        for (const citizen of this.citizens) {
            const destination = citizen.plan[0];
            if (!destination)
                continue;
            const place = this.places.find(p => p.id === destination);
            invariant(place, 'TOWN_DESTINATION', '计划含不存在的地点');
            const count = this.citizens.filter(c => c.location === destination && c.id !== citizen.id).length;
            if (count >= place.capacity) {
                const event = `${citizen.name}等待进入${place.name}`;
                citizen.memory.push(event);
                events.push(event);
                continue;
            }
            citizen.location = destination;
            citizen.plan.shift();
            const event = `${citizen.name}来到${place.name}`;
            citizen.memory.push(event);
            events.push(event);
        }
        return { tick: this.tick, events };
    }
}
export interface Visit {
    id: string;
    name: string;
    durationMinutes: number;
    cost: number;
    indoor: boolean;
}
/** 旅行案例的确定性约束检查：不把固定演示数据称为实时地图或天气。 */
export function planDay(visits: Visit[], limits: {
    minutes: number;
    budget: number;
    rainy: boolean;
}) {
    let minutes = 0, cost = 0;
    const selected: Visit[] = [];
    const rejected: {
        id: string;
        reason: string;
    }[] = [];
    for (const visit of visits) {
        if (limits.rainy && !visit.indoor) {
            rejected.push({ id: visit.id, reason: '下雨时跳过室外行程' });
            continue;
        }
        if (minutes + visit.durationMinutes > limits.minutes || cost + visit.cost > limits.budget) {
            rejected.push({ id: visit.id, reason: '时间或预算不足' });
            continue;
        }
        selected.push(visit);
        minutes += visit.durationMinutes;
        cost += visit.cost;
    }
    return { selected, rejected, minutes, cost, dataMode: 'fixture-not-live' };
}
