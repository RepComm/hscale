
export interface Peer {
  hostname: string;
  marmotPort: number;
  hscalePort: number;
  isSeedAllowed: boolean;
}

export interface ReqJson {
  
}
export interface ResJson extends ReqJson {
  success: boolean;
  error?: string;
}
export interface StatusPb {
  pb: boolean;
}
export interface StatusMarmot {
  marmot: boolean;
}
export interface StatusAll extends StatusPb,StatusMarmot {

}

export interface ReqSchemaGet extends ReqJson {}
export interface ResSchemaGet extends ResJson {
  schema: string;
}

export interface State {
  peers: Peer[];
  isSeedAllowed: boolean;
  isReplicateAllowed: boolean;
  isBootstrapAllowed: boolean;
  isBootstrapping: boolean;
  bootstrapSource: string;
  pb: boolean;
  marmot: boolean;
}

export interface ReqStateSet extends ReqJson, Partial<State> {}
export interface ResStateSet extends ResJson {}

export interface ReqStateGet extends ReqJson {}
export interface ResStateGet extends ResJson {
  state: State;
}

export interface ReqPeerAdd extends ReqJson {
  host: string;
}

export interface ReqPeerId extends ReqJson {}
export interface ResPeerId extends ResJson {
  peer: Peer;
}

export interface ReqMap {
  state_set: ReqStateSet;
  state_get: ReqStateGet;
  schema_get: ReqSchemaGet;
  peer_add: ReqPeerAdd;
  peer_id: ReqPeerId;
}

export interface ResMap {
  state_set: ResStateSet;
  state_get: ResStateGet;
  schema_get: ResSchemaGet;
  [key: string]: ResJson;
}

/**Request to hscale server API
 * 
 * Will reject if:
 * network issue
 * server supplies res.success == false
 * 
 * @param apiType type of API request called
 * @param params optional params specific to type
 * @param host optional host for talking to different nodes
 * @returns 
 */
export function req<K extends keyof ReqMap>(
  apiType: K,
  params: ReqMap[K] = undefined,
  host: string = ""): Promise<ResMap[K]> {
  return new Promise(async (resolve, reject)=>{
    try {
      const r = await fetch(`${host}/api/${apiType}`, {
        body: JSON.stringify(params),
        method: "POST"
      });
      const res = await r.json() as ResMap[K];
      if (!res.success) {
        reject(res.error);
      } else {
        resolve(res);
      }
    } catch (ex) {
      reject(ex);
    }
  });
}

export interface SSEMap {
  state: Partial<State>;
}
export interface SSEJson<K extends keyof SSEMap> {
  type: K;
  msg: SSEMap[K];
}
