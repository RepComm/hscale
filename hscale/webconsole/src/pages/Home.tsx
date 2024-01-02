
import { Component } from 'preact';
import "./style.css";

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

		return <div class="home border">
			<h1 class="text-center">hscale - webconsole</h1>
			<div class="section border">
				<h2 class="text-center">Local</h2>
				<div class="row">
					<h3 title="Target mode for replication">Mode</h3>
					<div class="col">
						<select class="dropdown align-flex-end">
							<option title="Data can be synced to new nodes">Seed</option>
							<option title="Data can be replicated to linked nodes">Replicate</option>
							<option title="Data incomplete, tries to sync with cluster">Bootstrap</option>
						</select>
					</div>
				</div>

				<div class="row">
					<h3 title="Replication status">Status :</h3>
					<div class="col">
						<h3 class="align-flex-end"
							title="syncing database from cluster for the first time"
						>Bootstrapping</h3>
					</div>
				</div>

				<div class="pocketbase border">
					<div class="row">
						<h2 title="a database in one executable">pocketbase</h2>
						<button
              class="btn"
              title="opens pocketbase web console"
              onClick={()=>{
                const proto = window.location.protocol;
                const hostname = window.location.hostname;
                window.open(`${proto}//${hostname}:8090/_`);
              }}
              disabled={!this.state.pbOnline}
              >manage</button>
						<div class="col">
							<div
								class="btn power align-flex-end"
								title="Toggle container online"
                onClick={async()=>{
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
								<span>{ this.state.pbOnline ? "Power Off" : "Power On"}</span>
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
                onClick={async()=>{
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
								<span>{ this.state.marmotOnline ? "Power Off" : "Power On"}</span>
								<div class={this.state.marmotOnline ? "on" : "off"} />
							</div>
						</div>
					</div>

					<div class="row">
						<h3 title="Human friendly name">Node Label</h3>
						<div class="col">
							<input class="align-flex-end" />
						</div>
					</div>
					<div class="row">
						<h3 title="Marmot port, should be accessible from cluster">Node Port</h3>
						<div class="col">
							<input class="align-flex-end" value="4221" />
						</div>
					</div>
					<div class="row">
						<h3 title="Unlinked cluster nodes will be pinged if active">Discoverable</h3>
						<div class="col">
							<div class="btn align-flex-end">ACTIVE</div>
						</div>
					</div>
					<div class="row">
						<h3 title="container status">Status</h3>
						<div class="col">
							<div class="align-flex-end">Online</div>
						</div>
					</div>

				</div>
			</div>

			<div class="section border">
				<h2 class="text-center">Cluster</h2>
				<div class="pod border">
					<div class="row">
						<div class="add" />
						<label for="host-input">Host : </label>
						<div class="col">
							<input
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

