#!/usr/bin/env node
const fs = require("fs");
const fetch = require("node-fetch");
const { GraphQLClient } = require("graphql-request");

const TWITTER_QUERY = `
query TwitterQuery($slug: String) {
  tournament(slug: $slug){
    events {
      entrants {
        nodes {
            participants {
              user {
                authorizations(types: [TWITTER]) {
                  externalUsername
                }
              }
    			}
        }
      }
    }
  }
}
`;

const ENDPOINT = "https://api.smash.gg/gql/alpha";
const TOKEN = fs.readFileSync("SMASHGG_TOKEN", "UTF8").trim();
const SLUG = process.argv[2];

const LENGTH = 280;

async function main() {
  const graphQLClient = new GraphQLClient(ENDPOINT, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const tournamentData = await graphQLClient.request(TWITTER_QUERY, {
    slug: SLUG,
  });

  const t = tournamentData.tournament;
  const handles = {};
  for (const event of t.events) {
    for (const entrant of event.entrants?.nodes) {
      for (const participant of entrant?.participants) {
        const user = participant?.user;
        const auth = user?.authorizations[0];
        if (auth) {
          const handle = "@" + auth.externalUsername;
          handles[handle] = true;
        }
      }
    }
  }

  // TODO: do the above but with map and filter instead of for loops

  // log handles delimited by space, limited to 180 characters per line
  const lines = [];
  let line = "";
  for (const handle in handles) {
    if (line.length + handle.length + 1 > LENGTH) {
      lines.push(line);
      line = "";
    }
    if (line.length > 0) {
      line += " ";
    }
    line += handle;
  }
  if (line.length > 0) {
    lines.push(line);
  }

  console.log(lines.join(" "));

  //console.log(handles.join(" "));
}

main().catch((error) => console.error(error));
