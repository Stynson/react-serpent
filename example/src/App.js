import React, { Component } from "react";

import { ArcherContainer, ArcherElement } from "react-serpent";

export default class App extends Component {
  render() {
    return (
      <ArcherContainer style={{ height: "300px" }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-around",
            padding: "20px"
          }}
        >
          <ArcherElement
            relations={[
              { targetId: "foo", targetAnchor: "left", sourceAnchor: "right" }
            ]}
            style={{ marginTop: "100px" }}
          >
            <div>bar</div>
          </ArcherElement>
          <ArcherElement
            id="foo"
            style={{ height: "30px", lineHeight: "30px" }}
          >
            <div>foo</div>
          </ArcherElement>
        </div>
      </ArcherContainer>
    );
  }
}
