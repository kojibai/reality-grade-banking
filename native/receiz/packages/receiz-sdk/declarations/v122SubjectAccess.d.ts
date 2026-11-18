export type ReceizSubjectAccessPublicBindingV122 = Readonly<{
    schema: "receiz.subject.access-public-key.v122";
    subjectId: string;
    subjectHead: string;
    accessKeyHead: string;
    publicKeyJwk: JsonWebKey;
    bindingDigest: string;
}>;
export type ReceizSubjectAccessKitV122 = Readonly<{
    schema: "receiz.subject.edge-access-kit.v122";
    binding: ReceizSubjectAccessPublicBindingV122;
    nonceB64u: string;
    encryptedPrivateKeyB64u: string;
    kitDigest: string;
}>;
export declare function createReceizSubjectAccessKeyV122(input: Readonly<{
    subjectId: string;
    subjectHead: string;
    accessKeyHead?: string;
    edgeWrappingKey: Uint8Array;
}>): Promise<Readonly<{
    publicBinding: ReceizSubjectAccessPublicBindingV122;
    accessKit: ReceizSubjectAccessKitV122;
}>>;
export declare function validateReceizSubjectAccessPublicBindingV122(value: ReceizSubjectAccessPublicBindingV122): Promise<boolean>;
export declare function openReceizSubjectAccessPrivateKeyV122(kit: ReceizSubjectAccessKitV122, edgeWrappingKey: Uint8Array): Promise<CryptoKey>;
//# sourceMappingURL=v122SubjectAccess.d.ts.map