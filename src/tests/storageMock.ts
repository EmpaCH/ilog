import { Vitest, VitestUtils } from "vitest";



export const storageMockFactory = (): Storage => {
    const storage: Map<string, string> = new Map();
    return {
        length: storage.entries.length,
        key: (index: number) => {return Array.from(storage.keys())[index]},
        getItem: (key: string) => {return storage.get(key) || null},
        setItem: (key: string, value: string) => {return storage.set(key, value)},
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
    };
    };


export const storage = storageMockFactory();
// export const setMock = (vi: VitestUtils, storageProvider: () => Storage) => {
//     vi.mock("localStorage", storageProvider);
// }