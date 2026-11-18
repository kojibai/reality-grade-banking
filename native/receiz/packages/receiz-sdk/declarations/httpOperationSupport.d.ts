/** Source-route evidence, never live deployment qualification or proof authority.
 * Historical Connect contracts are preserved explicitly; the default server has
 * no implementation for their absent routes. Read siblings are evidenced by
 * the v106 source; the v107 write inventory records the compatibility disposition.
 */
export type ReceizHttpOperationSupport = Readonly<{
    executionMode: "current-http" | "historical-http";
    currentRouteImplemented: boolean;
    routes: readonly Readonly<{
        pathPattern: string;
        routeFile: string | null;
    }>[];
    evidence: readonly string[];
    semanticLimit?: string;
}>;
export declare const RECEIZ_HTTP_OPERATION_SUPPORT: Readonly<Record<string, ReceizHttpOperationSupport>>;
//# sourceMappingURL=httpOperationSupport.d.ts.map