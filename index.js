#!/usr/bin/env node
const fs = require("fs");
const fetch = require("node-fetch");
const { GraphQLClient } = require("graphql-request");

const Mode = Object.freeze({
  NAMES_ONLY: Symbol("NAMES_ONLY"),
  TWITTER_OR_NAME: Symbol("TWITTER_OR_NAME"),
  NAME_AND_TWITTER: Symbol("NAME_AND_TWITTER"),
});

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
const TOKEN = fs.readFileSync("SMASHGG_TOKEN", "utf8").trim();
const SLUG = process.argv[2];

async function main() {
  const graphQLClient = new GraphQLClient(ENDPOINT, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const tournamentData = await graphQLClient.request(TWITTER_QUERY, {
    slug: SLUG,
  });

  const t = tournamentData.tournament;
  const handles = [];
  for (const event of t.events) {
    // get twitter handles for each entrant using map and filter

    for (const entrants of event.entrants.nodes) {
      for (const participant of entrants.participants) {
        const user = participant.user;
        const auth = user.authorizations[0];
        if (auth) {
          handles.push("@" + auth.externalUsername);
        }
      }
    }
  }

  console.log(handles.join(" "));
}

main().catch((error) => console.error(error));
