Coke_project_demo_using_ExtJS
=============================

Coca-Cola had need to represent their marketing/promotional events (from data on Quickbase) onto a calendar in order to streamline understanding and efficiency with their promotional planning department. Since off the shelf QB does not have a calander ui, I layered TreeGrid, a 3rd party ExtJS utility to meet Coke's needs. As illustrated in coke.gif, this project creates a calendar ui for reading/saving data on Quickbase upon each user action.

== Features:
- has both view and edit modes, depending on role of users.
- each widget (in the form of rectangular box) represents an event to schedule
- events/widgets are categorized by section, then by row and dates
- edit mode allows user to move/resize widgets according to # days/weeks 
- business rules apply that widget cannot move to certain places, will snap back after notifying user of problem
- if widget moved over another widget, both turn red indicating conflict in timing
- right click menu - options:
                   - set geo-target (based on event being regional) ... saves to QB and changes color
                   - set micro-target (based on sample promotions) ... saves to QB and changes color
                   - set locked/unlock ... saves, changes color, makes widget unable to be moved
                   - set reserve/unreserve ... saves, changes color, provides scheduled reminder of event
                   - see record, opens tab showing actual record in QB report format
                   - create new row per category
- holding bin on right side of page, to move widgets temporarily while arranging others
- view mode features customization of user specified date range via jQuery calendar widget 

== Bug-fix
- calendar saves in GMT time allowing edit from any timezone
                