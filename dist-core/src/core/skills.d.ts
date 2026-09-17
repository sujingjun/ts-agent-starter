export interface Skill {
    name: string;
    description: string;
    body: string;
    sha256: string;
}
/** 只接受简单 name/description 元数据及 description 的折行形式。未知权限字段不能扩大工具权限。 */
export declare function parseSkill(markdown: string): Skill;
export declare class SkillCatalog {
    private readonly map;
    add(skill: Skill): void;
    metadata(): {
        name: string;
        description: string;
        sha256: string;
    }[];
    load(name: string): Skill;
    loadDirectory(root: string): Promise<void>;
}
