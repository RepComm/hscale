
import { Component } from 'preact';
import "./style.css";
import { useRef } from 'preact/hooks';
import { Peer, ReqStateSet, SSEJson, SSEMap, State, req } from './api';

interface Props {

}
interface HomeState extends State {
}

// interface Pod {
//   label: string;
//   id: string;
//   hostname: string;
//   status: string;
// }

export class Home extends Component<Props, HomeState> {
  sseSrc: EventSource;

  async componentDidMount() {
    const res = await req("state_get");
    this.setState(res.state);

    this.sseSrc = new EventSource("/sse");
    this.sseSrc.addEventListener("message", (m)=>{
      console.log("SSE", m);
      let msg = undefined as SSEJson<keyof SSEMap>;

      try {
        msg = JSON.parse(m.data);
      } catch (ex) {
        console.warn("Invalid json from SSE", ex);
      }
      
      switch (msg.type) {
        case "state": {
          this.setState(msg.msg);
        } break;
        default:
          break;
      }
    });
    
  }
  componentWillUnmount(): void {
    this.sseSrc.close();
    this.sseSrc = undefined;
  }
  renderPeer(p: Peer) {
    return <div class="pod border">
      {/* <div class="kv">
        <span class="k">Label : </span><span class="v">{p.hostname}</span>
      </div> */}

      {/* <div class="kv">
        <span class="k">ID : </span> <span class="v">{p.}</span>
      </div> */}

      <div class="kv">
        <span class="k">Hostname : </span><span class="v">{p.hostname}</span>
      </div>

      {/* <div class="kv">
        <span class="k">Status : </span><span class="v">{p.status}</span>
      </div> */}
    </div>
  }
  renderPeers(peers: Peer[]) {
    const results = [];

    if (!peers) return results;
    for (const pod of peers) {
      results.push(this.renderPeer(pod));
    }

    return results;
  }
  render() {

    const hostRef = useRef<HTMLInputElement>();
    const seedRef = useRef<HTMLInputElement>();

    return <div class="home border">
      <h1 class="text-center header">hscale - webconsole</h1>
      <div class="section border">
        <h2 class="text-center header">Local</h2>
        <div class="row">
          <h2 title="a database in one executable">hscale</h2>
        </div>
        <div class="row indent">
          <h3 for="b-replicate">Replicate</h3>
          <input id="b-replicate" type="checkbox"></input>

          <h3 class="indent" title="Replication status">Status :</h3>
          <h3
            class="align-flex-end"
            title="syncing database from cluster for the first time"
          >Replicating</h3>
        </div>
        <div class="row indent">
          <h3 for="b-seed">Seed</h3>
          <input
            ref={seedRef}
            id="b-seed"
            type="checkbox"
            onChange={() => {
              req("state_set", {
                isSeedAllowed: seedRef.current.checked
              }).catch((reason) => {
                seedRef.current.checked = !seedRef.current.checked;
              });
            }}
          ></input>

          <h3 class="indent" title="Replication status">Status :</h3>
          <h3
            class="align-flex-end"
            title="syncing database from cluster for the first time"
          >Seeding</h3>
        </div>
        <div class="row indent">
          <h3 for="b-bootstrap">Rebuild Data</h3>
          <div class="col">
            <button
              class="btn"
              id="bootstrap"
              onClick={async () => {
                const KEY = "HSCALE";
                if (
                  confirm(
                    "DANGER: Bootstrap will rebuild local db from a Seed enabled node in the existing cluster. If a seed is not found then no data will change. Please confirm:"
                  ) && prompt(
                    `Please enter: ${KEY} to confirm data loss is allowed:`, ""
                  ) === KEY
                ) {
                  req("state_set", {
                    isBootstrapAllowed: true
                  }).catch((reason)=>{
                    alert("Issue: " + reason);
                  });
                } else {
                  alert("Bootstrap action is cancelled due to user input.");
                }
              }}
            >Bootstrap</button>
          </div>
          <h3 class="indent" title="Replication status">Status :</h3>
          <h3
            class="align-flex-end"
            title="syncing database from cluster for the first time"
          >Bootstrapping</h3>
        </div>

        <div class="row">
          <h3 class="indent" title="Unlinked cluster nodes will be pinged if active">Discoverable</h3>
          <div class="col">
            <div class="btn align-flex-end">ACTIVE</div>
          </div>
        </div>

        <div class="pocketbase border">
          <div class="row">
            <h2 title="a database in one executable">pocketbase</h2>
            <button
              class="btn"
              title="opens pocketbase web console"
              onClick={() => {
                window.open("/pb");
              }}
              disabled={!this.state.pb}
            >manage</button>
            <div class="col">
              <div
                class="btn power align-flex-end"
                title="Toggle container online"
                onClick={async () => {
                  req("state_set", { pb: !this.state.pb });
                }}
              >
                <span>{this.state.pb ? "Power Off" : "Power On"}</span>
                <div class={this.state.pb ? "on" : "off"} />
              </div>
            </div>
          </div>
        </div>
        <div class="marmot border">
          <div class="row">
            <h2 title="an sqlite replicator">marmot</h2>
            <div class="col">
              <div
                class="btn power align-flex-end"
                title="Toggle container online"
                onClick={async () => {
                  req("state_set", {
                    marmot: !this.state.marmot
                  });
                }}
              >
                <span>{this.state.marmot ? "Power Off" : "Power On"}</span>
                <div class={this.state.marmot ? "on" : "off"} />
              </div>
            </div>
          </div>

          <div class="row">
            <h3 class="indent" title="Human friendly name">Node Label</h3>
            <div class="col">
              <input class="align-flex-end" />
            </div>
          </div>
          <div class="row">
            <h3 class="indent" title="Marmot port, should be accessible from cluster">Node Port</h3>
            <div class="col">
              <input class="align-flex-end" value="4221" />
            </div>
          </div>
          <div class="row">
            <h3 class="indent" title="container status">Status</h3>
            <div class="col">
              <div class="align-flex-end">Online</div>
            </div>
          </div>

        </div>
      </div>

      <div class="section border">
        <h2 class="text-center header">Cluster</h2>
        <div class="pod border">
          <div class="row">
            <div class="add"
              onClick={() => {
                let host = hostRef.current.value;
                if (!host.startsWith("http://")) {
                  host = `http://${host}`;
                }
                req("peer_add", { host });
              }}
            />
            <label for="host-input">Host : </label>
            <div class="col">
              <input
                ref={hostRef}
                class="align-flex-end"
                id="host-input" value="http://localhost:8095" />
            </div>
          </div>
        </div>
        {this.renderPeers(this.state.peers)}
      </div>
    </div>
  }
}

