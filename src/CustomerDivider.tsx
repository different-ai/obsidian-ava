import {HelpOutline} from "@mui/icons-material";
import {Divider, Box, Tooltip} from "@mui/material";
import React from "react";

interface CustomDividerProps {
    text?: React.ReactNode;
    tooltip?: React.ReactNode;
}
const CustomDivider = ({text, tooltip}: CustomDividerProps) => {
  return (
    <Box
      sx={{
        "& .MuiDivider-root": {
          textAlign: "center",
          margin: "1rem 0",
          userSelect: "none",
        },
      }}
    >
      <Divider>
        {text}
        {
          tooltip &&
          <Tooltip
            sx={{
              verticalAlign: "middle",
              marginLeft: "0.5rem",
              marginRight: "0.5rem",
            }}
            title={tooltip}>
            <HelpOutline/>
          </Tooltip>
        }
      </Divider>
    </Box>
  );
};

export default CustomDivider;
