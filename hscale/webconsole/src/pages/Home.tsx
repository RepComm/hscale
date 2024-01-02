
import { Component } from 'preact';
import "./style.css";
import { useRef } from 'preact/hooks';

interface Props {

}
interface State {
  pbOnline: boolean;
  marmotOnline: boolean;
}

interface Pod {
  label: string;
  id: string;
  hostname: string;
  status: string;
}

export class Home extends Component<Props, State> {
  async componentDidMount() {
    const raw = await fetch("/api/status/all");
    const res = await raw.json();

    this.setState({
      pbOnline: res.result.status.pb === "online",
      marmotOnline: res.result.status.marmot === "online",
    });
  }
  renderPod(pod: Pod) {
    return <div class="pod border">
      <div class="kv">
        <span class="k">Label : </span><span class="v">{pod.label}</span>
      </div>

      <div class="kv">
        <span class="k">ID : </span> <span class="v">{pod.id}</span>
      </div>

      <div class="kv">
        <span class="k">Hostname : </span><span class="v">{pod.hostname}</span>
      </div>

      <div class="kv">
        <span class="k">Status : </span><span class="v">{pod.status}</span>
      </div>
    </div>
  }
  renderPods(pods: Pod[]) {
    const results = [];

    for (const pod of pods) {
      results.push(this.renderPod(pod));
    }

    return results;
  }
  render() {
    const pods = [
      {
        label: "Demo Pod",
        hostname: "localhost",
        id: "abcdefghijklmnopqrstuvwxyz",
        status: "online"
      }
    ];

    const hostRef = useRef<HTMLInputElement>();

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
          <h3 for="b-replicate">Seed</h3>
          <input id="b-replicate" type="checkbox"></input>

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
              onClick={()=>{
                const KEY = "HSCALE";

                if (
                  confirm(
                    "DANGER: Bootstrap will rebuild local db from a Seed enabled node in the existing cluster. If a seed is not found then no data will change. Please confirm:"
                  ) && prompt(
                    `Please enter: ${KEY} to confirm data loss is allowed:`, ""
                  ) === KEY
                ) {
                  fetch("/api/bootstrap");
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
                const proto = window.location.protocol;
                const hostname = window.location.hostname;
                window.open("/pb");
              }}
              disabled={!this.state.pbOnline}
            >manage</button>
            <div class="col">
              <div
                class="btn power align-flex-end"
                title="Toggle container online"
                onClick={async () => {
                  const raw = await fetch("/api/toggle/pb");
                  const res = await raw.json();

                  if (res.status === "success") {
                    this.setState({
                      pbOnline: res.result.status === "online"
                    });
                  } else {
                    console.warn("Failed to toggle pb");
                  }
                }}
              >
                <span>{this.state.pbOnline ? "Power Off" : "Power On"}</span>
                <div class={this.state.pbOnline ? "on" : "off"} />
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
                  const raw = await fetch("/api/toggle/marmot");
                  const res = await raw.json();

                  if (res.status === "success") {
                    this.setState({
                      marmotOnline: res.result.status === "online"
                    });
                  } else {
                    console.warn("Failed to toggle marmot");
                  }
                }}
              >
                <span>{this.state.marmotOnline ? "Power Off" : "Power On"}</span>
                <div class={this.state.marmotOnline ? "on" : "off"} />
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
              onClick={async () => {
                const raw = await fetch(`/api/add/${hostRef.current.value}`);
                const res = await raw.json();

                if (res.status === "success") {

                }
              }}
            />
            <label for="host-input">Host : </label>
            <div class="col">
              <input
                ref={hostRef}
                class="align-flex-end"
                id="host-input" value="localhost:4221" />
            </div>
          </div>
        </div>
        {this.renderPods(pods)}
      </div>
    </div>
  }
}

