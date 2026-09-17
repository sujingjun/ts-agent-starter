import { invariant } from './errors.js';
/** 赛博小镇的无图形机制实验：观察、计划、行动、记忆，不包含原项目游戏引擎或美术。 */
export class TownSimulation {
    tick = 0;
    places;
    citizens;
    constructor(places, citizens) { invariant(new Set(places.map(p => p.id)).size === places.length, 'TOWN_PLACE', '场所重复'); this.places = structuredClone(places); this.citizens = structuredClone(citizens); }
    step() {
        this.tick++;
        const events = [];
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
/** 旅行案例的确定性约束检查：不把固定演示数据称为实时地图或天气。 */
export function planDay(visits, limits) {
    let minutes = 0, cost = 0;
    const selected = [];
    const rejected = [];
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
//# sourceMappingURL=simulation.js.map