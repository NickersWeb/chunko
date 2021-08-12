const fileLastIndex = (fileSize: number, chunkSize: number) => {
    return (fileSize / chunkSize);
}

export enum UploadFileChunkState {
    BEGIN_CHUNKING,
    START,
    CHUNKING,
    ERROR,
    FINISH
}

export enum ChunkOutput {
    DataURL,
    Blob
}

export const chunko = (file: File,
    settings: Settings,
    endPoint: (chunk: string | Blob, index: number) => Promise<any>,
    onProgress: (state: UploadFileChunkState, index: number, lastIndex: number) => void,
    onLoadEnd: (state: UploadFileChunkState, err: Error | null) => void) => {

    if (!file) {
        onLoadEnd(UploadFileChunkState.ERROR, new Error('File does not exist.'));
    }

    const chunkSizeOutter = settings.chunkSizeMB * 1048576;

    //getting the file size so that we can use it for loop statement
    const size = file.size;

    try {

        const func = (f: File, chunkSize: number, set: number, indexPart: number, index: number, size: number) => {


            const endPointFunc = () => {
                onProgress(UploadFileChunkState.CHUNKING, indexPart, fileLastIndex(f.size, chunkSize));

                // Increment the index position(chunk) 
                set += chunkSize;
                // Keeping track of when to exit, by incrementing till we reach file size(end of file).
                index += chunkSize;
                indexPart++;


                func(f, chunkSize, set, indexPart, index, size);
            }


            if (index < size) {

                //slice the file by specifying the index(chunk size)
                const blob = f.slice(set, set + chunkSize);

                switch (settings.chunkOutput) {
                    case ChunkOutput.DataURL: {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);

                        reader.onloadend = (e) => {
                            if (e !== null && e.target !== null) {
                                if (e.target.readyState === FileReader.DONE) {
                                    if (e.target.result !== null) {
                                        if (typeof e.target.result === "string") {
                                            endPoint(e.target.result.replace(/^data:.+;base64,/, ''), indexPart).then(endPointFunc);
                                        }

                                    }

                                }


                            }
                        }
                    }
                        break;
                    case ChunkOutput.Blob:
                    default:
                        endPoint(blob, indexPart).then(endPointFunc);
                        break;
                }



            } else {
                onLoadEnd(UploadFileChunkState.FINISH, null);
            }

        }

        onProgress(UploadFileChunkState.BEGIN_CHUNKING, 0, fileLastIndex(file.size, chunkSizeOutter));

        func(file, chunkSizeOutter, 0, 0, 0, size);

    } catch (e) {
        onLoadEnd(UploadFileChunkState.ERROR, e);
    }
}

class Settings {

    constructor() {
        this.chunkOutput = ChunkOutput.DataURL;
        this.chunkSizeMB = 5;
    }

    chunkOutput: ChunkOutput
    chunkSizeMB: number
}
