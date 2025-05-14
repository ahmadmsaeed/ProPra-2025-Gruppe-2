declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: any): Promise<{
        sub: any;
        email: any;
        name: any;
        role: any;
    }>;
}
export {};
