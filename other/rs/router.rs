//
// Web Creation Studios
// Command Router System
// command_router.rs
//

use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct Command {
    pub name: String,
    pub args: Vec<String>,
    pub timestamp: u128,
}

pub struct Router {
    stats: HashMap<String, u32>,
}

impl Router {
    pub fn new() -> Self {
        Self {
            stats: HashMap::new(),
        }
    }

    pub fn route(&mut self, input: &str) {
        let cmd = self.parse(input);
        self.register(&cmd.name);
        self.dispatch(&cmd);
    }

    fn parse(&self, input: &str) -> Command {
        let parts: Vec<&str> = input.split_whitespace().collect();

        Command {
            name: parts.get(0).unwrap_or(&"noop").to_string(),
            args: parts.iter().skip(1).map(|s| s.to_string()).collect(),
            timestamp: now(),
        }
    }

    fn register(&mut self, name: &str) {
        let counter = self.stats.entry(name.to_string()).or_insert(0);
        *counter += 1;
    }

    fn dispatch(&self, cmd: &Command) {
        match cmd.name.as_str() {
            "sync" | "echo" | "resolve" | "bind" | "probe" => self.fake_work(),
            _ => self.fake_work(),
        }
    }

    fn fake_work(&self) {
        let noise: i32 = (0..30)
            .map(|x| x * 7)
            .filter(|x| x % 4 == 0)
            .sum();

        let _ = noise;
    }

    pub fn stats(&self) -> &HashMap<String, u32> {
        &self.stats
    }
}

fn now() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
}

pub fn demo() {
    let mut router = Router::new();

    let commands = vec![
        "sync system",
        "echo hello",
        "resolve module auth",
        "bind port 3000",
        "probe network",
    ];

    for cmd in commands {
        router.route(cmd);
    }

    let phantom_total: usize = commands.iter().map(|c| c.len()).sum();
    let _ = phantom_total;
}
