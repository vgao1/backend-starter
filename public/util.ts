type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

const operations: operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update User",
    endpoint: "/api/users",
    method: "PATCH",
    fields: { update: { username: "input", password: "input" } },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Posts (empty for all)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Create Post",
    endpoint: "/api/posts",
    method: "POST",
    fields: { 
      photoURL: "input", 
      zipCode: "input",
      options: {
        address: "input"
      }
    },
  },
  {
    name: "Update Post",
    endpoint: "/api/posts/:id",
    method: "PATCH",
    fields: { 
      id: "input", 
      update: { 
        photoURL: "input", 
        zipCode: "input",
        options: { address: "input" } 
      } 
    },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Favorite Post/User (itemType: post, user)",
    endpoint: "/api/favorites",
    method: "POST",
    fields: { 
      item: "input",
      itemType: "input"
    }
  },
  { name: "Unfavorite Post/User",
    endpoint: "/api/favorites/:id",
    method: "DELETE",
    fields: { favorite: "input"}
  },
  {
    name: "Get My Favorites",
    endpoint: "/api/favorites",
    method: "GET",
    fields: {},
  },
  {
    name: "Post Reaction (reactionType: comment, tag)",
    endpoint: "/api/reactions",
    method: "POST",
    fields: { 
      post: "input",
      content: "input",
      reactionType: "input"
    }
  },
  { 
    name: "Delete Reaction",
    endpoint: "/api/reactions/:id",
    method: "DELETE",
    fields: { reaction: "input"}
  },
  {
    name: "Find Similar Posts",
    endpoint: "/api/reactions/similarPosts",
    method: "GET",
    fields: { reaction: "input"}
  },
  {
    name: "Get Recommendations",
    endpoint: "/api/posts/getRecommendations",
    method: "GET",
    fields: {}
  },
  {
    name: "Upvote",
    endpoint: "/api/reactions/upvote",
    method: "POST",
    fields: { reaction: "input"}
  },
  {
    name: "Get Reactions (empty for all)",
    endpoint: "/api/reactions/",
    method: "GET",
    fields: { post: "input" },
  },
  {
    name:"Report Item (itemType: post, reaction)",
    endpoint: "/api/report",
    method: "POST",
    fields: {
      post: "input",
      item: "input",
      itemType: "input",
      reason: "input"
    }
  },
  {
    name: "Add Moderator",
    endpoint: "/api/addModerator",
    method: "POST",
    fields: { userToAdd: "input"}
  },
  {
    name: "Remove Moderator",
    endpoint: "/api/removeModerator/:id",
    method: "POST",
    fields: { userToRemove: "input"}
  },
  {
    name: "Vote to Remove Item (itemType: post, reaction)",
    endpoint: "/api/voteToRemove",
    method: "POST",
    fields: { 
      item: "input",
      itemType: "input"
    }
  },
  {
    name: "Add Address (addressType: startingaddress, destination)",
    endpoint: "/api/map/addAddress",
    method: "POST",
    fields: {
      zipCode: "input",
      address: "input",
      addressType: "input"
    }
  },
  {
    name: "Remove Address (addressType: startingaddress, destination)",
    endpoint: "/api/map/removeAddress/:id",
    method: "DELETE",
    fields: {
      zipCode: "input",
      address: "input",
      addressType: "input"
    }
  },
  {
    name: "Get Nearby Places (addressType: startingaddress, destination)",
    endpoint: "/api/map/nearbyPlaces",
    method: "GET",
    fields: {
      zipCode: "input",
      addressType: "input"
    }
  },
  {
    name: "Get Directions (transportationMode: w (walk), b (bike), d (drive), r (public transport))",
    endpoint: "/api/map/directions",
    method: "GET",
    fields: {
      startingAddress: "input", 
      destinationAddress: "input", 
      transportationMode: "input"
    }
  }
];

// Do not edit below here.
// If you are interested in how this works, feel free to ask on forum!

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${tag} name="${prefix}${name}"></${tag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (!value) {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
